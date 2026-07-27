#!/bin/bash
# Test boolean validation logic
# Tracks pass/fail counts and exits non-zero if any test expectation is wrong

PASS_COUNT=0
FAIL_COUNT=0

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

# Helper: expect validation to PASS (should return 0)
expect_pass() {
  if "$@" >/dev/null 2>&1; then
    echo "OK (passed): $*"
    ((PASS_COUNT++))
  else
    echo "UNEXPECTED FAIL: $*"
    ((FAIL_COUNT++))
  fi
}

# Helper: expect validation to FAIL (should return 1)
expect_fail() {
  if "$@" >/dev/null 2>&1; then
    echo "UNEXPECTED PASS: $*"
    ((FAIL_COUNT++))
  else
    echo "OK (rejected): $*"
    ((PASS_COUNT++))
  fi
}

# Test valid inputs
echo "=== Testing valid inputs ==="
INPUT_PRUNE_VOLUMES=true INPUT_DOCKER_PRUNE=false INPUT_COPY_STACK_FILE=true INPUT_PULL_IMAGES_FIRST=false \
  expect_pass validate_booleans

# Test defaults (unset inputs)
echo "=== Testing defaults (unset inputs) ==="
unset INPUT_PRUNE_VOLUMES INPUT_DOCKER_PRUNE INPUT_COPY_STACK_FILE INPUT_PULL_IMAGES_FIRST
expect_pass validate_booleans

# Test invalid inputs
echo "=== Testing invalid inputs ==="
INPUT_PRUNE_VOLUMES=yes INPUT_DOCKER_PRUNE=no INPUT_COPY_STACK_FILE=1 INPUT_PULL_IMAGES_FIRST=0 \
  expect_fail validate_booleans

echo ""
echo "========================================="
echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "========================================="

[ "$FAIL_COUNT" -eq 0 ]
