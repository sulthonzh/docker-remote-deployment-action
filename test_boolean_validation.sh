#!/bin/bash
# Test boolean validation logic

# Simulate the validation logic
validate_booleans() {
  # Set defaults
  INPUT_PRUNE_VOLUMES="${INPUT_PRUNE_VOLUMES:-false}"
  INPUT_DOCKER_PRUNE="${INPUT_DOCKER_PRUNE:-false}"
  INPUT_COPY_STACK_FILE="${INPUT_COPY_STACK_FILE:-false}"
  INPUT_PULL_IMAGES_FIRST="${INPUT_PULL_IMAGES_FIRST:-false}"
  
  # Validate
  if [ "$INPUT_PRUNE_VOLUMES" != 'true' ] && [ "$INPUT_PRUNE_VOLUMES" != 'false' ]; then
    echo "Error: prune_volumes must be 'true' or 'false', got: $INPUT_PRUNE_VOLUMES"
    return 1
  fi
  if [ "$INPUT_DOCKER_PRUNE" != 'true' ] && [ "$INPUT_DOCKER_PRUNE" != 'false' ]; then
    echo "Error: docker_prune must be 'true' or 'false', got: $INPUT_DOCKER_PRUNE"
    return 1
  fi
  if [ "$INPUT_COPY_STACK_FILE" != 'true' ] && [ "$INPUT_COPY_STACK_FILE" != 'false' ]; then
    echo "Error: copy_stack_file must be 'true' or 'false', got: $INPUT_COPY_STACK_FILE"
    return 1
  fi
  if [ "$INPUT_PULL_IMAGES_FIRST" != 'true' ] && [ "$INPUT_PULL_IMAGES_FIRST" != 'false' ]; then
    echo "Error: pull_images_first must be 'true' or 'false', got: $INPUT_PULL_IMAGES_FIRST"
    return 1
  fi
  
  echo "PASS: All boolean inputs validated"
  return 0
}

# Test valid inputs
echo "=== Testing valid inputs ==="
INPUT_PRUNE_VOLUMES=true INPUT_DOCKER_PRUNE=false INPUT_COPY_STACK_FILE=true INPUT_PULL_IMAGES_FIRST=false validate_booleans

# Test defaults (unset inputs)
echo "=== Testing defaults (unset inputs) ==="
unset INPUT_PRUNE_VOLUMES INPUT_DOCKER_PRUNE INPUT_COPY_STACK_FILE INPUT_PULL_IMAGES_FIRST
validate_booleans

# Test invalid inputs
echo "=== Testing invalid inputs ==="
INPUT_PRUNE_VOLUMES=yes INPUT_DOCKER_PRUNE=no INPUT_COPY_STACK_FILE=1 INPUT_PULL_IMAGES_FIRST=0 validate_booleans

echo "Done"
