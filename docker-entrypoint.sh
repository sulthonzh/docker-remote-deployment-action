#!/bin/sh
set -eu

execute_ssh(){
  echo "Execute Over SSH: $*"
  ssh -q -i "$HOME/.ssh/id_rsa" \
      -o UserKnownHostsFile=/dev/null \
      -p "$INPUT_REMOTE_DOCKER_PORT" \
      -o StrictHostKeyChecking=no "$INPUT_REMOTE_DOCKER_HOST" "$*"
  if [ $? -ne 0 ]; then
    echo "Error: SSH command failed: $*"
    exit 1
  fi
}

if [ -z "${INPUT_REMOTE_DOCKER_PORT+x}" ]; then
  INPUT_REMOTE_DOCKER_PORT=22
fi

if [ -z "${INPUT_REMOTE_DOCKER_HOST+x}" ]; then
    echo "Input remote_docker_host is required!"
    exit 1
fi

if [ -z "${INPUT_SSH_PUBLIC_KEY+x}" ]; then
    echo "Input ssh_public_key is required!"
    exit 1
fi

if [ -z "${INPUT_SSH_PRIVATE_KEY+x}" ]; then
    echo "Input ssh_private_key is required!"
    exit 1
fi

if [ -z "${INPUT_ARGS+x}" ]; then
  echo "Input input_args is required!"
  exit 1
fi

# Validate that args don't contain shell metacharacters
if echo "$INPUT_ARGS" | grep -q '[;&|`$()]'; then
  echo "Error: input_args contains potentially dangerous shell metacharacters"
  exit 1
fi

if [ -z "${INPUT_DEPLOY_PATH+x}" ]; then
  INPUT_DEPLOY_PATH=~/docker-deployment
fi

if [ -z "${INPUT_STACK_FILE_NAME+x}" ]; then
  INPUT_STACK_FILE_NAME=docker-compose.yaml
fi

if [ -z "${INPUT_KEEP_FILES+x}" ]; then
  INPUT_KEEP_FILES=4
else
  INPUT_KEEP_FILES=$((INPUT_KEEP_FILES+1))
fi

if [ -z "${INPUT_DOCKER_REGISTRY_URI+x}" ]; then
  INPUT_DOCKER_REGISTRY_URI=https://registry.hub.docker.com
fi

if [ -z "${INPUT_COPY_STACK_FILE+x}" ]; then
  INPUT_COPY_STACK_FILE=false
fi

STACK_FILE=${INPUT_STACK_FILE_NAME}
DEPLOYMENT_COMMAND_OPTIONS=""


if [ "$INPUT_COPY_STACK_FILE" == "true" ]; then
  STACK_FILE="$INPUT_DEPLOY_PATH/$STACK_FILE"
else
  DEPLOYMENT_COMMAND_OPTIONS=" --log-level debug --host ssh://$INPUT_REMOTE_DOCKER_HOST:$INPUT_REMOTE_DOCKER_PORT"
fi

case $INPUT_DEPLOYMENT_MODE in

  docker-swarm)
    DEPLOYMENT_COMMAND="docker $DEPLOYMENT_COMMAND_OPTIONS stack deploy --compose-file $STACK_FILE"
  ;;

  *)
    INPUT_DEPLOYMENT_MODE="docker-compose"
    DEPLOYMENT_COMMAND="docker-compose -f $STACK_FILE $DEPLOYMENT_COMMAND_OPTIONS"
  ;;
esac


SSH_HOST=${INPUT_REMOTE_DOCKER_HOST#*@}

echo "Registering SSH keys..."

# register the private key with the agent.
mkdir -p ~/.ssh
ls ~/.ssh
printf '%s\n' "$INPUT_SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
printf '%s\n' "$INPUT_SSH_PUBLIC_KEY" > ~/.ssh/id_rsa.pub
chmod 600 ~/.ssh/id_rsa.pub
chmod 700 ~/.ssh
eval $(ssh-agent -s) > /dev/null 2>&1 || {
  echo "Error: Failed to start SSH agent"
  exit 1
}
ssh-add ~/.ssh/id_rsa 2>/dev/null || {
  echo "Error: Failed to add SSH key to agent"
  exit 1
}

echo "Add known hosts"
ssh-keyscan -p "$INPUT_REMOTE_DOCKER_PORT" "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null
ssh-keyscan -p "$INPUT_REMOTE_DOCKER_PORT" "$SSH_HOST" >> /etc/ssh/ssh_known_hosts 2>/dev/null || true

echo "Create docker context"
if ! docker context create remote --docker "host=ssh://$INPUT_REMOTE_DOCKER_HOST:$INPUT_REMOTE_DOCKER_PORT"; then
  echo "Error: Failed to create Docker context"
  exit 1
fi

if ! docker context use remote; then
  echo "Error: Failed to use Docker context"
  exit 1
fi

if ! [ -z "${INPUT_DOCKER_REGISTRY_USERNAME+x}" ] && ! [ -z "${INPUT_DOCKER_REGISTRY_PASSWORD+x}" ]; then
  echo "Connecting to $INPUT_REMOTE_DOCKER_HOST... Command: docker login"
  if ! echo "$INPUT_DOCKER_REGISTRY_PASSWORD" | docker login -u "$INPUT_DOCKER_REGISTRY_USERNAME" --password-stdin "$INPUT_DOCKER_REGISTRY_URI"; then
    echo "Error: Docker login failed"
    exit 1
  fi
fi

if ! [ -z "${INPUT_DOCKER_PRUNE+x}" ] && [ "$INPUT_DOCKER_PRUNE" = 'true' ] ; then
  echo "Warning: Running docker system prune -a (this will remove unused containers, networks, images, and volumes)"
  if ! yes | docker --log-level debug --host "ssh://$INPUT_REMOTE_DOCKER_HOST:$INPUT_REMOTE_DOCKER_PORT" system prune -a; then
    echo "Error: Docker system prune failed"
    exit 1
  fi
fi

if ! [ -z "${INPUT_COPY_STACK_FILE+x}" ] && [ "$INPUT_COPY_STACK_FILE" = 'true' ] ; then
  execute_ssh "mkdir -p $INPUT_DEPLOY_PATH/stacks || true"
  FILE_NAME="docker-stack-$(date +%Y%m%d%H%M%S).yaml"

  scp -i "$HOME/.ssh/id_rsa" \
      -o UserKnownHostsFile=/dev/null \
      -o StrictHostKeyChecking=no \
      -P "$INPUT_REMOTE_DOCKER_PORT" \
      "$INPUT_STACK_FILE_NAME" "$INPUT_REMOTE_DOCKER_HOST:$INPUT_DEPLOY_PATH/stacks/$FILE_NAME"

  execute_ssh "ln -nfs $INPUT_DEPLOY_PATH/stacks/$FILE_NAME $INPUT_DEPLOY_PATH/$INPUT_STACK_FILE_NAME"
  execute_ssh "ls -t $INPUT_DEPLOY_PATH/stacks/docker-stack-* 2>/dev/null | tail -n +$INPUT_KEEP_FILES | xargs rm --  2>/dev/null || true"

  if ! [ -z "${INPUT_PULL_IMAGES_FIRST+x}" ] && [ "$INPUT_PULL_IMAGES_FIRST" = 'true' ] && [ "$INPUT_DEPLOYMENT_MODE" = 'docker-compose' ] ; then
    echo "Pulling images before deployment..."
    execute_ssh "${DEPLOYMENT_COMMAND}" "pull"
  fi

  if ! [ -z "${INPUT_PRE_DEPLOYMENT_COMMAND_ARGS+x}" ] && [ "$INPUT_DEPLOYMENT_MODE" = 'docker-compose' ] ; then
    echo "Running pre-deployment commands..."
    # Quote pre-deployment args properly
    PRE_DEPLOY_ARGS=$(printf '%q' "$INPUT_PRE_DEPLOYMENT_COMMAND_ARGS")
    execute_ssh "${DEPLOYMENT_COMMAND}" "$PRE_DEPLOY_ARGS"
  fi

  echo "Executing deployment command..."
  execute_ssh "${DEPLOYMENT_COMMAND}" "$INPUT_ARGS"
else
  echo "Connecting to $INPUT_REMOTE_DOCKER_HOST... Command: ${DEPLOYMENT_COMMAND} ${INPUT_ARGS}"
  if ! "${DEPLOYMENT_COMMAND}" "${INPUT_ARGS}"; then
    echo "Error: Deployment command failed"
    exit 1
  fi
fi

echo "Deployment completed successfully!"
