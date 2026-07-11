#!/bin/bash
set -euo pipefail
# shellcheck disable=SC2016 # SC2016 false positives: single-quoting is intentional to prevent variable expansion in case/grep patterns

# Initialize temp files early (before trap) to prevent unbound variable errors in cleanup
temp_passwd_file=""
remote_passwd=""

# Cleanup function to remove SSH keys and agent
cleanup() {
  echo "Cleaning up..."
  # Remove remote temporary password file FIRST (needs SSH keys still present)
  # Must run before SSH key removal below, otherwise SSH auth fails silently
  if [ -n "${remote_passwd+x}" ] && [ -n "$remote_passwd" ] && [ -n "${INPUT_REMOTE_DOCKER_HOST+x}" ] && [ -n "$INPUT_REMOTE_DOCKER_HOST" ]; then
    ssh -q -i "$HOME/.ssh/id_rsa" \
      -o UserKnownHostsFile=/dev/null \
      -o StrictHostKeyChecking=no \
      -p "${INPUT_REMOTE_DOCKER_PORT:-22}" \
      "$INPUT_REMOTE_DOCKER_HOST" "rm -f \"$remote_passwd\" 2>/dev/null || true" 2>/dev/null || true
  fi
  # Remove docker context (before killing SSH agent)
  docker context rm remote -f 2>/dev/null || true
  # Remove local temporary password file
  [ -n "${temp_passwd_file+x}" ] && rm -f "$temp_passwd_file" 2>/dev/null || true
  # Kill SSH agent if running
  if [ -n "${SSH_AGENT_PID+x}" ] && [ -n "$SSH_AGENT_PID" ]; then
    kill "$SSH_AGENT_PID" 2>/dev/null || true
  fi
  # Remove SSH keys LAST (after all SSH-dependent cleanup is done)
  rm -f ~/.ssh/id_rsa ~/.ssh/id_rsa.pub 2>/dev/null || true
}

# Set trap for cleanup on exit and signals.
# ERR is intentionally omitted: under 'set -e', a failing command triggers ERR trap
# (running cleanup), then the script exits triggering EXIT trap (running cleanup again).
# EXIT alone covers all exit paths including signal-terminated and set -e failures.
trap cleanup EXIT SIGINT SIGTERM

execute_ssh(){
  echo "Execute Over SSH: $*"
  if ! ssh -q -t -i "$HOME/.ssh/id_rsa" \
      -o UserKnownHostsFile=/dev/null \
      -o StrictHostKeyChecking=no \
      -p "$INPUT_REMOTE_DOCKER_PORT" \
      "$INPUT_REMOTE_DOCKER_HOST" "$@"; then
    echo "Error: SSH command failed: $*"
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
  # Includes redirection operators (<>), separators (;&|), substitution ($()),
  # quoting ("'), and backtick command substitution
  if printf '%s' "$input_value" | grep -qE '[;&|`$()<>\"'"'"']'; then
    echo "Error: $input_name contains dangerous characters that could cause command injection"
    exit 1
  fi

  # Check for control characters (newline, carriage return, tab, null, etc.)
  # These can bypass the metacharacter check but still cause command injection via eval
  case "$input_value" in
    *$'\n'*|*$'\r'*|*$'\t'*)
      echo "Error: $input_name contains control characters (newline/tab/null)"
      exit 1
      ;;
  esac

  # Check for path traversal attempts (..), absolute paths, and suspicious patterns
  # Skip validation for args and stack_file_name as they may need special characters
  # deploy_path legitimately uses absolute paths (/opt/...) and home expansion (~/...)
  # so it is exempted from the /* and ~* checks, but still checked for ..
  if [[ "$input_name" != "args" && "$input_name" != "stack_file_name" ]]; then
    case "$input_value" in
      *..*)
        echo "Error: $input_name contains path traversal patterns (..)"
        exit 1
        ;;
    esac
    if [[ "$input_name" != "deploy_path" ]]; then
      case "$input_value" in
        /*|~*|'${'*|'$'*)
          echo "Error: $input_name contains potentially dangerous path patterns"
          exit 1
          ;;
      esac
    fi
  fi
}

# Reject environment variable expansion in values that should be literal paths
# Must run after main validate_input to ensure it applies to all inputs including exempted ones
# deploy_path is checked because it's expanded in shell commands, which could leak environment variables
# args is excluded because it needs to pass through as-is to docker-compose/docker-swarm
validate_env_expansion() {
  local input_name="$1"
  local input_value="$2"

  if [[ "$input_name" != "args" ]]; then
    case "$input_value" in
      *'${'*|'$'*)
        echo "Error: $input_name contains environment variable expansion patterns"
        exit 1
        ;;
    esac
  fi

  # Additional URL-specific validation for docker_registry_uri
  # Allow : and / for URLs but block command substitution patterns
  if [ "$input_name" = "docker_registry_uri" ]; then
    if printf '%s' "$input_value" | grep -qE '\$\(|`|\$\{'; then
      echo "Error: docker_registry_uri contains command substitution patterns"
      exit 1
    fi
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
# Use printf instead of echo to avoid flag injection (-e/-n/-E interpreted by echo)
if ! printf '%s' "$INPUT_REMOTE_DOCKER_HOST" | grep -qE '^[^@]+@[^@]+$'; then
  echo "Error: remote_docker_host must be in format 'user@host'"
  exit 1
fi

# Validate remote_docker_host for shell metacharacters and control characters
# (was previously only format-checked, missing security validation)
validate_input "remote_docker_host" "$INPUT_REMOTE_DOCKER_HOST"
validate_env_expansion "remote_docker_host" "$INPUT_REMOTE_DOCKER_HOST"

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

# Set defaults BEFORE validation (to prevent validation failures on unset optional inputs)
if [ -z "${INPUT_DEPLOY_PATH+x}" ]; then
  INPUT_DEPLOY_PATH=~/docker-deployment
fi

if [ -z "${INPUT_STACK_FILE_NAME+x}" ]; then
  INPUT_STACK_FILE_NAME=docker-compose.yml
fi

if [ -z "${INPUT_DOCKER_REGISTRY_URI+x}" ]; then
  INPUT_DOCKER_REGISTRY_URI=https://registry.hub.docker.com
fi

if [ -z "${INPUT_DEPLOYMENT_MODE+x}" ]; then
  INPUT_DEPLOYMENT_MODE=docker-compose
fi

# Enhanced input validation
validate_input "args" "$INPUT_ARGS"
validate_input "deploy_path" "$INPUT_DEPLOY_PATH"
validate_input "stack_file_name" "$INPUT_STACK_FILE_NAME"
validate_input "docker_registry_uri" "$INPUT_DOCKER_REGISTRY_URI"

# Validate environment variable expansion separately (applies to all inputs except args)
validate_env_expansion "args" "$INPUT_ARGS"
validate_env_expansion "deploy_path" "$INPUT_DEPLOY_PATH"
validate_env_expansion "stack_file_name" "$INPUT_STACK_FILE_NAME"
validate_env_expansion "docker_registry_uri" "$INPUT_DOCKER_REGISTRY_URI"
# pre_deployment_command_args is optional and docker-compose mode only per action.yml.
# Set INPUT_DEPLOYMENT_MODE default to docker-compose before validating so the check works correctly.
if [ -n "${INPUT_PRE_DEPLOYMENT_COMMAND_ARGS+x}" ] && [ -n "$INPUT_PRE_DEPLOYMENT_COMMAND_ARGS" ] && [ "$INPUT_DEPLOYMENT_MODE" = 'docker-compose' ]; then
  validate_input "pre_deployment_command_args" "$INPUT_PRE_DEPLOYMENT_COMMAND_ARGS"
  validate_env_expansion "pre_deployment_command_args" "$INPUT_PRE_DEPLOYMENT_COMMAND_ARGS"
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
if [ "$INPUT_KEEP_FILES" -lt 1 ]; then
  echo "Error: keep_files must be at least 1: $INPUT_KEEP_FILES"
  exit 1
fi

# Note: keep_files represents total versions to keep INCLUDING the currently deployed one.
# Example: keep_files=4 means current version + up to 3 previous versions (total 4).

# Default already set above before validation

if [ -z "${INPUT_COPY_STACK_FILE+x}" ]; then
  INPUT_COPY_STACK_FILE=false
fi

STACK_FILE=${INPUT_STACK_FILE_NAME}
DEPLOYMENT_COMMAND_OPTIONS=""

# Build deployment command based on mode
# Note: STACK_FILE is quoted with escaped quotes (\") because it's interpolated into the final command string
# This ensures filenames with spaces don't break the command

if [ "$INPUT_COPY_STACK_FILE" == "true" ]; then
  STACK_FILE="$INPUT_DEPLOY_PATH/$STACK_FILE"
else
  DEPLOYMENT_COMMAND_OPTIONS=" --log-level debug --host ssh://$INPUT_REMOTE_DOCKER_HOST:$INPUT_REMOTE_DOCKER_PORT"
fi

case "$INPUT_DEPLOYMENT_MODE" in

  docker-swarm)
    DEPLOYMENT_COMMAND="docker $DEPLOYMENT_COMMAND_OPTIONS stack deploy --compose-file \"$STACK_FILE\""
  ;;

  docker-compose)
    DEPLOYMENT_COMMAND="docker-compose -f \"$STACK_FILE\" $DEPLOYMENT_COMMAND_OPTIONS"
  ;;

  *)
    echo "Error: deployment_mode must be 'docker-compose' or 'docker-swarm', got: $INPUT_DEPLOYMENT_MODE"
    exit 1
  ;;
esac


echo "Registering SSH keys..."

# register the private key with the agent.
mkdir -p ~/.ssh
chmod 700 ~/.ssh
printf '%s\n' "$INPUT_SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
printf '%s\n' "$INPUT_SSH_PUBLIC_KEY" > ~/.ssh/id_rsa.pub
chmod 600 ~/.ssh/id_rsa.pub
eval "$(ssh-agent)"
ssh-add ~/.ssh/id_rsa

# Note: ssh-keyscan is intentionally omitted. Both execute_ssh and scp use
# UserKnownHostsFile=/dev/null + StrictHostKeyChecking=no, so known_hosts is
# never consulted. Running keyscan adds 5-10s latency and can hang on
# unreachable hosts for the full SSH timeout period.

# Set context
echo "Create docker context"
# Remove existing context if it exists to avoid conflicts
if docker context ls 2>/dev/null | grep -qw "remote"; then
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

# Handle Docker registry authentication
# Login runs BOTH locally and remotely (when copy_stack_file=true) because:
# - copy_stack_file=false: docker-compose runs locally with --host ssh://, client sends auth to daemon
# - copy_stack_file=true: docker-compose runs on remote via SSH, remote daemon needs its own credentials
if [ -n "${INPUT_DOCKER_REGISTRY_USERNAME:-}" ] && [ -n "${INPUT_DOCKER_REGISTRY_PASSWORD:-}" ]; then
  # Validate username to prevent command injection — it's interpolated into a
  # single-quoted string sent to the remote shell via execute_ssh. A single quote
  # in the username would break out of the quoting context.
  validate_input "docker_registry_username" "$INPUT_DOCKER_REGISTRY_USERNAME"
  validate_env_expansion "docker_registry_username" "$INPUT_DOCKER_REGISTRY_USERNAME"
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
  # Also login on the remote server when copy_stack_file=true, since deployment commands
  # run via SSH on the remote host and the remote Docker daemon needs its own credentials
  if [ "$INPUT_COPY_STACK_FILE" = 'true' ]; then
    echo "Running docker login on remote host..."
    # Copy password file to remote, login, then remove it
    # remote_passwd is initialized at the top of the script so cleanup() can
    # remove it if the script exits before the login/cleanup sequence completes.
    remote_passwd="/tmp/.docker-passwd-$$"
    scp -q -i "$HOME/.ssh/id_rsa" \
        -o UserKnownHostsFile=/dev/null \
        -o StrictHostKeyChecking=no \
        -P "$INPUT_REMOTE_DOCKER_PORT" \
        "$temp_passwd_file" "$INPUT_REMOTE_DOCKER_HOST:$remote_passwd" 2>/dev/null
    if ! execute_ssh "docker login -u '$INPUT_DOCKER_REGISTRY_USERNAME' --password-file '$remote_passwd' '$INPUT_DOCKER_REGISTRY_URI' && rm -f '$remote_passwd'"; then
      echo "Error: Remote docker login failed"
      execute_ssh "rm -f '$remote_passwd' 2>/dev/null || true"
      cleanup
      exit 1
    fi
  fi
  # temp_passwd_file will be cleaned up by the cleanup function
fi

# Handle stack file copying and deployment
if ! [ -z "${INPUT_COPY_STACK_FILE+x}" ] && [ "$INPUT_COPY_STACK_FILE" = 'true' ] ; then
  execute_ssh "mkdir -p \"$INPUT_DEPLOY_PATH\"/stacks || true"
  FILE_NAME="docker-stack-$(date +%Y%m%d%s).yaml"

  scp -i "$HOME/.ssh/id_rsa" \
      -o UserKnownHostsFile=/dev/null \
      -o StrictHostKeyChecking=no \
      -P "$INPUT_REMOTE_DOCKER_PORT" \
      "$INPUT_STACK_FILE_NAME" "$INPUT_REMOTE_DOCKER_HOST:$INPUT_DEPLOY_PATH/stacks/$FILE_NAME"

  execute_ssh "ln -nfs \"$INPUT_DEPLOY_PATH\"/stacks/$FILE_NAME \"$INPUT_DEPLOY_PATH\"/$INPUT_STACK_FILE_NAME"
  execute_ssh "ls -t \"$INPUT_DEPLOY_PATH\"/stacks/docker-stack-* 2>/dev/null | tail -n +$((10#$INPUT_KEEP_FILES+1)) | while read -r file; do rm -f \"\$file\"; done 2>/dev/null || true"

  # Pre-deployment validation should run BEFORE pulling images to fail fast.
  # E.g., 'docker-compose config' validates the file — if it fails, skip the
  # expensive image pull and deployment entirely.
  if [ -n "${INPUT_PRE_DEPLOYMENT_COMMAND_ARGS+x}" ] && [ "$INPUT_DEPLOYMENT_MODE" = 'docker-compose' ] && [ -n "$INPUT_PRE_DEPLOYMENT_COMMAND_ARGS" ] ; then
    echo "Running pre-deployment command: $INPUT_PRE_DEPLOYMENT_COMMAND_ARGS"
    execute_ssh "${DEPLOYMENT_COMMAND}" "$INPUT_PRE_DEPLOYMENT_COMMAND_ARGS" 2>&1
  fi

  if [ -n "${INPUT_PULL_IMAGES_FIRST+x}" ] && [ "$INPUT_PULL_IMAGES_FIRST" = 'true' ]; then
    if [ "$INPUT_DEPLOYMENT_MODE" = 'docker-compose' ]; then
      echo "Pulling images first..."
      execute_ssh "${DEPLOYMENT_COMMAND} pull"
    else
      echo "Warning: pull_images_first is not supported in docker-swarm mode. Swarm pulls images on the nodes automatically. Ignoring."
    fi
  fi

  echo "Running deployment command: $INPUT_ARGS"
  execute_ssh "${DEPLOYMENT_COMMAND}" "$INPUT_ARGS" 2>&1
else
  echo "Connecting to $INPUT_REMOTE_DOCKER_HOST... Command: ${DEPLOYMENT_COMMAND} ${INPUT_ARGS}"

  # Pre-deployment validation should run BEFORE pulling images to fail fast.
  # E.g., 'docker-compose config' validates the file — if it fails, skip the
  # expensive image pull and deployment entirely.
  if [ -n "${INPUT_PRE_DEPLOYMENT_COMMAND_ARGS+x}" ] && [ "$INPUT_DEPLOYMENT_MODE" = 'docker-compose' ] && [ -n "$INPUT_PRE_DEPLOYMENT_COMMAND_ARGS" ]; then
    echo "Running pre-deployment command: $INPUT_PRE_DEPLOYMENT_COMMAND_ARGS"
    eval "${DEPLOYMENT_COMMAND} ${INPUT_PRE_DEPLOYMENT_COMMAND_ARGS}" 2>&1
  fi

  if [ -n "${INPUT_PULL_IMAGES_FIRST+x}" ] && [ "$INPUT_PULL_IMAGES_FIRST" = 'true' ]; then
    if [ "$INPUT_DEPLOYMENT_MODE" = 'docker-compose' ]; then
      echo "Pulling images first..."
      eval "${DEPLOYMENT_COMMAND} pull" 2>&1
    else
      echo "Warning: pull_images_first is not supported in docker-swarm mode. Swarm pulls images on the nodes automatically. Ignoring."
    fi
  fi

  # Use eval to safely execute the command string, preserving spacing and special characters in arguments
  # Variables are validated earlier to prevent command injection
  eval "${DEPLOYMENT_COMMAND} ${INPUT_ARGS}" 2>&1
fi

# Handle Docker system prune AFTER deployment
if ! [ -z "${INPUT_DOCKER_PRUNE+x}" ] && [ "$INPUT_DOCKER_PRUNE" = 'true' ] ; then
  echo "WARNING: This will remove all unused images, containers, and networks."
  echo "This is a destructive operation that cannot be undone."
  echo "Note: docker system prune -a does NOT remove volumes by default."
  echo "To remove volumes too, add --volumes flag to the prune command."
  echo "Proceeding with docker prune automatically..."
  if ! docker --log-level debug --host "ssh://$INPUT_REMOTE_DOCKER_HOST:$INPUT_REMOTE_DOCKER_PORT" system prune -a -f; then
    echo "Error: Docker prune failed"
    exit 1
  fi
fi
