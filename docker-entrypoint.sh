#!/bin/sh
set -eu

execute_ssh(){
  echo "Execute Over SSH: $*"
  ssh -q -t -i "$HOME/.ssh/id_rsa" \
      -o UserKnownHostsFile=/dev/null \
      -p "$INPUT_REMOTE_DOCKER_PORT" \
      -o StrictHostKeyChecking=no "$INPUT_REMOTE_DOCKER_HOST" "$*"
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

if [ -z "${INPUT_DEPLOY_PATH+x}" ]; then
  INPUT_DEPLOY_PATH=~/docker-deployment
fi

if [ -z "${INPUT_STACK_FILE_NAME+x}" ]; then
  INPUT_STACK_FILE_NAME=docker-compose.yaml
fi

if [ -z "${INPUT_KEEP_FILES+x}" ]; then
  INPUT_KEEP_FILES=3
else
  # Validate that keep_files is a positive number
  if ! [[ "$INPUT_KEEP_FILES" =~ ^[0-9]+$ ]] || [ "$INPUT_KEEP_FILES" -lt 1 ]; then
    echo "Error: keep_files must be a positive number, got: $INPUT_KEEP_FILES"
    exit 1
  fi
  INPUT_KEEP_FILES="$INPUT_KEEP_FILES"
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
#chmod 600 "~/.ssh"
eval $(ssh-agent)
ssh-add ~/.ssh/id_rsa

echo "Add known hosts"
if ! ssh-keyscan -p "$INPUT_REMOTE_DOCKER_PORT" "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null; then
  echo "Warning: ssh-keyscan failed for $SSH_HOST — host may be unreachable"
fi
if ! ssh-keyscan -p "$INPUT_REMOTE_DOCKER_PORT" "$SSH_HOST" >> /etc/ssh/ssh_known_hosts 2>/dev/null; then
  echo "Warning: failed to add $SSH_HOST to system known_hosts"
fi

echo "Create docker context"
if ! docker context ls | grep -q "remote"; then
  docker context create remote --docker "host=ssh://$INPUT_REMOTE_DOCKER_HOST:$INPUT_REMOTE_DOCKER_PORT"
fi
docker context use remote

# Set up trap to clean up context on exit
cleanup() {
  if docker context ls | grep -q "remote"; then
    docker context use default || true
    docker context rm remote --force || true
  fi
}
trap cleanup EXIT

if ! [ -z "${INPUT_DOCKER_REGISTRY_USERNAME+x}" ] && ! [ -z "${INPUT_DOCKER_REGISTRY_PASSWORD+x}" ]; then
  echo "Connecting to $INPUT_REMOTE_DOCKER_HOST... Command: docker login"
  if [ -z "$INPUT_DOCKER_REGISTRY_URI" ]; then
    echo "Error: docker_registry_uri is required when using docker registry credentials"
    exit 1
  fi
  echo "$INPUT_DOCKER_REGISTRY_PASSWORD" | docker login -u "$INPUT_DOCKER_REGISTRY_USERNAME" --password-stdin "$INPUT_DOCKER_REGISTRY_URI"
fi

if ! [ -z "${INPUT_DOCKER_PRUNE+x}" ] && [ "$INPUT_DOCKER_PRUNE" = 'true' ] ; then
  yes | docker --log-level debug --host "ssh://$INPUT_REMOTE_DOCKER_HOST:$INPUT_REMOTE_DOCKER_PORT" system prune -a 2>&1
fi

if ! [ -z "${INPUT_COPY_STACK_FILE+x}" ] && [ $INPUT_COPY_STACK_FILE = 'true' ] ; then
  execute_ssh "mkdir -p $INPUT_DEPLOY_PATH/stacks || true"
  # Validate stack file path to prevent directory traversal
  if [[ "$INPUT_STACK_FILE_NAME" == *..* ]] || [[ "$INPUT_STACK_FILE_NAME" == /* ]]; then
    echo "Error: Invalid stack file path: $INPUT_STACK_FILE_NAME"
    exit 1
  fi
  
  FILE_NAME="docker-stack-$(date +%Y%m%d%s).yaml"

  scp -i "$HOME/.ssh/id_rsa" \
      -o UserKnownHostsFile=/dev/null \
      -o StrictHostKeyChecking=no \
      -P "$INPUT_REMOTE_DOCKER_PORT" \
      "$INPUT_STACK_FILE_NAME" "$INPUT_REMOTE_DOCKER_HOST:$INPUT_DEPLOY_PATH/stacks/$FILE_NAME"

  execute_ssh "ln -nfs $INPUT_DEPLOY_PATH/stacks/$FILE_NAME $INPUT_DEPLOY_PATH/$INPUT_STACK_FILE_NAME"
  execute_ssh "find '$INPUT_DEPLOY_PATH/stacks' -name 'docker-stack-*.yaml' -print0 | sort -zr | awk -v n=\"$INPUT_KEEP_FILES\" 'BEGIN{RS=\"\\0\"} NR>n' | xargs -0 rm -f -- 2>/dev/null || true"

  if ! [ -z "${INPUT_PULL_IMAGES_FIRST+x}" ] && [ $INPUT_PULL_IMAGES_FIRST = 'true' ] && [ $INPUT_DEPLOYMENT_MODE = 'docker-compose' ] ; then
    execute_ssh "$DEPLOYMENT_COMMAND" "pull"
  fi

  if ! [ -z "${INPUT_PRE_DEPLOYMENT_COMMAND_ARGS+x}" ] && [ "$INPUT_DEPLOYMENT_MODE" = 'docker-compose' ] ; then
    execute_ssh "${DEPLOYMENT_COMMAND}  $INPUT_PRE_DEPLOYMENT_COMMAND_ARGS" 2>&1
  fi

  execute_ssh "$DEPLOYMENT_COMMAND" "$INPUT_ARGS" 2>&1
else
  echo "Connecting to $INPUT_REMOTE_DOCKER_HOST... Command: ${DEPLOYMENT_COMMAND} ${INPUT_ARGS}"
  ${DEPLOYMENT_COMMAND} ${INPUT_ARGS} 2>&1
fi


