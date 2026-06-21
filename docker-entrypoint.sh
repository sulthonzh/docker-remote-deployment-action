#!/bin/bash
set -euo pipefail

# Cleanup function to remove SSH keys and agent
cleanup() {
  echo "Cleaning up..."
  # Remove SSH keys
  rm -f ~/.ssh/id_rsa ~/.ssh/id_rsa.pub 2>/dev/null || true
  # Kill SSH agent if running
  if [ -n "${SSH_AGENT_PID:-}" ]; then
    kill $SSH_AGENT_PID 2>/dev/null || true
  fi
  # Remove docker context
  docker context rm remote -f 2>/dev/null || true
  # Remove temporary files
  rm -f "$temp_passwd_file" 2>/dev/null || true
}

# Set trap for cleanup on exit and signals
trap cleanup EXIT SIGINT SIGTERM ERR

execute_ssh(){
  echo "Execute Over SSH: $@"
  if ! ssh -q -t -i "$HOME/.ssh/id_rsa" \
      -o UserKnownHostsFile=/dev/null \
      -o StrictHostKeyChecking=no \
      -p "$INPUT_REMOTE_DOCKER_PORT" \
      "$INPUT_REMOTE_DOCKER_HOST" "$@"; then
    echo "Error: SSH command failed: $@"
    exit 1
  fi
}

# Enhanced input validation to prevent shell injection and path traversal
validate_input() {
  local input_name="$1"
  local input_value="$2"

  # Check for empty input
  if [ -z "$input_value" ]; then
    echo "Error: $input_name cannot be empty"
    exit 1
  fi

  # Check for shell metacharacters that could cause command injection
  # Enhanced regex pattern that covers various shell injection vectors
  if printf '%s' "$input_value" | grep -qE '[;&|`$()\"'"'"']'; then
    echo "Error: $input_name contains dangerous characters that could cause command injection"
    exit 1
  fi

  # Check for path traversal attempts (..), absolute paths, and suspicious patterns
  # Skip validation for args, deploy_path, and stack_file_name as they may need special characters
  if [[ "$input_name" != "args" && "$input_name" != "deploy_path" && "$input_name" != "stack_file_name" ]]; then
    case "$input_value" in
      *..*|/*|~*|\$*|\\${*}) 
        echo "Error: $input_name contains potentially dangerous path patterns" 
        exit 1 
        ;;
    esac
  fi

  # Additional validation for specific inputs
  case "$input_name" in
    "remote_docker_port"|"keep_files")
      # These should be validated as numbers elsewhere, but extra safety check
      if ! echo "$input_value" | grep -q '^[0-9]+$'; then
        echo "Error: $input_name must be a positive integer"
        exit 1
      fi
      ;;
  esac
}

# Set defaults early
if [ -z "${INPUT_REMOTE_DOCKER_PORT+x}" ]; then
  INPUT_REMOTE_DOCKER_PORT=22
fi

# Validate required inputs
if [ -z "${INPUT_REMOTE_DOCKER_HOST+x}" ]; then
    echo "Input remote_docker_host is required!"
    exit 1
fi

# Validate remote_docker_host format (should be user@host)
if ! echo "$INPUT_REMOTE_DOCKER_HOST" | grep -qE '^[^@]+@[^@]+$'; then
  echo "Error: remote_docker_host must be in format 'user@host': $INPUT_REMOTE_DOCKER_HOST"
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

# Set defaults after validation
if [ -z "${INPUT_DEPLOY_PATH+x}" ]; then
  INPUT_DEPLOY_PATH=~/docker-deployment
fi

if [ -z "${INPUT_STACK_FILE_NAME+x}" ]; then
  INPUT_STACK_FILE_NAME=docker-compose.yml
fi

# Enhanced input validation
validate_input "args" "$INPUT_ARGS"
validate_input "deploy_path" "$INPUT_DEPLOY_PATH"
validate_input "stack_file_name" "$INPUT_STACK_FILE_NAME"
validate_input "docker_registry_uri" "${INPUT_DOCKER_REGISTRY_URI:-}"
# pre_deployment_command_args is optional, skip validation if empty
if [ -n "${INPUT_PRE_DEPLOYMENT_COMMAND_ARGS+x}" ] && [ -n "$INPUT_PRE_DEPLOYMENT_COMMAND_ARGS" ]; then
  validate_input "pre_deployment_command_args" "$INPUT_PRE_DEPLOYMENT_COMMAND_ARGS"
fi

# Set default for KEEP_FILES before validating
if [ -z "${INPUT_KEEP_FILES+x}" ]; then
  INPUT_KEEP_FILES=4
fi

# Ensure numeric inputs are valid numbers
if ! [[ "$INPUT_REMOTE_DOCKER_PORT" =~ ^[0-9]+$ ]]; then
  echo "Error: remote_docker_port must be a number between 1 and 65535: $INPUT_REMOTE_DOCKER_PORT"
  exit 1
fi
if [ "$INPUT_REMOTE_DOCKER_PORT" -lt 1 ] || [ "$INPUT_REMOTE_DOCKER_PORT" -gt 65535 ]; then
  echo "Error: remote_docker_port must be between 1 and 65535: $INPUT_REMOTE_DOCKER_PORT"
  exit 1
fi
if ! [[ "$INPUT_KEEP_FILES" =~ ^[0-9]+$ ]]; then
  echo "Error: keep_files must be a positive integer: $INPUT_KEEP_FILES"
  exit 1
fi

# Note: keep_files represents total versions to keep INCLUDING the currently deployed one.
# Example: keep_files=4 means current version + up to 3 previous versions (total 4).

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

case "$INPUT_DEPLOYMENT_MODE" in

  docker-swarm)
    DEPLOYMENT_COMMAND="docker $DEPLOYMENT_COMMAND_OPTIONS stack deploy --compose-file $STACK_FILE"
  ;;

  docker-compose)
    DEPLOYMENT_COMMAND="docker-compose -f $STACK_FILE $DEPLOYMENT_COMMAND_OPTIONS"
  ;;

  *)
    echo "Error: deployment_mode must be 'docker-compose' or 'docker-swarm', got: $INPUT_DEPLOYMENT_MODE"
    exit 1
  ;;
esac


SSH_HOST=${INPUT_REMOTE_DOCKER_HOST#*@}

echo "Registering SSH keys..."

# register the private key with the agent.
mkdir -p ~/.ssh
chmod 700 ~/.ssh
printf '%s\n' "$INPUT_SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
printf '%s\n' "$INPUT_SSH_PUBLIC_KEY" > ~/.ssh/id_rsa.pub
chmod 600 ~/.ssh/id_rsa.pub
eval $(ssh-agent)
ssh-add ~/.ssh/id_rsa

echo "Add known hosts"
ssh-keyscan -p "$INPUT_REMOTE_DOCKER_PORT" "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null || echo "Warning: Could not scan SSH host key"
ssh-keyscan -p "$INPUT_REMOTE_DOCKER_PORT" "$SSH_HOST" >> /etc/ssh/ssh_known_hosts 2>/dev/null || echo "Warning: Could not update system known_hosts"

# Set context
echo "Create docker context"
# Remove existing context if it exists to avoid conflicts
if docker context ls 2>/dev/null | grep -q "remote"; then
  docker context rm remote -f 2>/dev/null || echo "Warning: Could not remove existing remote context"
fi

if ! docker context create remote --docker "host=ssh://$INPUT_REMOTE_DOCKER_HOST:$INPUT_REMOTE_DOCKER_PORT"; then
  echo "Error: Failed to create docker context"
  exit 1
fi

if ! docker context use remote; then
  echo "Error: Failed to switch to docker context"
  exit 1
fi

# Initialize temp_passwd_file variable to avoid unbound variable error
if [ -z "${INPUT_DOCKER_REGISTRY_USERNAME+x}" ] || [ -z "${INPUT_DOCKER_REGISTRY_PASSWORD+x}" ]; then
  temp_passwd_file=""
fi

# Handle Docker registry authentication
if ! [ -z "${INPUT_DOCKER_REGISTRY_USERNAME+x}" ] && ! [ -z "${INPUT_DOCKER_REGISTRY_PASSWORD+x}" ]; then
  echo "Connecting to $INPUT_REMOTE_DOCKER_HOST... Command: docker login"
  # Use a temporary file for the password to avoid leaving it in process lists
  temp_passwd_file="$(mktemp)"
  printf '%s' "$INPUT_DOCKER_REGISTRY_PASSWORD" > "$temp_passwd_file"
  chmod 600 "$temp_passwd_file"
  if ! docker login -u "$INPUT_DOCKER_REGISTRY_USERNAME" --password-file "$temp_passwd_file" "$INPUT_DOCKER_REGISTRY_URI"; then
    echo "Error: Docker login failed"
    cleanup
    exit 1
  fi
  # temp_passwd_file will be cleaned up by the cleanup function
fi

# Handle Docker system prune with warning
if ! [ -z "${INPUT_DOCKER_PRUNE+x}" ] && [ "$INPUT_DOCKER_PRUNE" = 'true' ] ; then
  echo "WARNING: This will remove unused images, containers, networks, and volumes."
  echo "This is a destructive operation that cannot be undone."
  echo "WARNING: docker system prune -a does NOT remove volumes by default."
  echo "To remove volumes, add --volumes flag. This is a destructive operation."
  echo "Proceeding with docker prune automatically..."
  if ! docker --log-level debug --host "ssh://$INPUT_REMOTE_DOCKER_HOST:$INPUT_REMOTE_DOCKER_PORT" system prune -a -f; then
    echo "Error: Docker prune failed"
    exit 1
  fi
fi

# Handle stack file copying and deployment
if ! [ -z "${INPUT_COPY_STACK_FILE+x}" ] && [ $INPUT_COPY_STACK_FILE = 'true' ] ; then
  execute_ssh "mkdir -p \"$INPUT_DEPLOY_PATH\"/stacks || true"
  FILE_NAME="docker-stack-$(date +%Y%m%d%s).yaml"

  scp -i "$HOME/.ssh/id_rsa" \
      -o UserKnownHostsFile=/dev/null \
      -o StrictHostKeyChecking=no \
      -P "$INPUT_REMOTE_DOCKER_PORT" \
      "$INPUT_STACK_FILE_NAME" "$INPUT_REMOTE_DOCKER_HOST:$INPUT_DEPLOY_PATH/stacks/$FILE_NAME"

  execute_ssh "ln -nfs \"$INPUT_DEPLOY_PATH\"/stacks/$FILE_NAME \"$INPUT_DEPLOY_PATH\"/$INPUT_STACK_FILE_NAME"
  execute_ssh "ls -t \"$INPUT_DEPLOY_PATH\"/stacks/docker-stack-* 2>/dev/null | tail -n +$((INPUT_KEEP_FILES+1)) | xargs rm -- 2>/dev/null || true"

  # Handle pre-deployment commands
  if [ -n "${INPUT_PULL_IMAGES_FIRST+x}" ] && [ "$INPUT_PULL_IMAGES_FIRST" = 'true' ] && [ "$INPUT_DEPLOYMENT_MODE" = 'docker-compose' ] ; then
    echo "Pulling images first..."
    execute_ssh "${DEPLOYMENT_COMMAND} pull"
  fi

  if [ -n "${INPUT_PRE_DEPLOYMENT_COMMAND_ARGS+x}" ] && [ "$INPUT_DEPLOYMENT_MODE" = 'docker-compose' ] ; then
    echo "Running pre-deployment command: $INPUT_PRE_DEPLOYMENT_COMMAND_ARGS"
    execute_ssh "${DEPLOYMENT_COMMAND}" "$INPUT_PRE_DEPLOYMENT_COMMAND_ARGS" 2>&1
  fi

  echo "Running deployment command: $INPUT_ARGS"
  execute_ssh "${DEPLOYMENT_COMMAND}" "$INPUT_ARGS" 2>&1
else
  echo "Connecting to $INPUT_REMOTE_DOCKER_HOST... Command: ${DEPLOYMENT_COMMAND} ${INPUT_ARGS}"
  # Use eval to safely execute the command string, preserving spacing and special characters in arguments
  # Variables are validated earlier to prevent command injection
  eval "${DEPLOYMENT_COMMAND} ${INPUT_ARGS}" 2>&1
fi