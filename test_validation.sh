#!/bin/bash

# Test script to validate the pattern matching
# Tracks pass/fail counts and exits non-zero if any test expectation is wrong

PASS_COUNT=0
FAIL_COUNT=0

validate_input() {
  local input_name="$1"
  local input_value="$2"
  # Check for control characters
  case "$input_value" in
    *$'\n'*|*$'\r'*|*$'\t'*)
      echo "FAIL: Control characters in $input_name: '$input_value'"
      return 1
      ;;
  esac
  
  # Check for path traversal
  if [[ "$input_name" != "args" && "$input_name" != "stack_file_name" ]]; then
    case "$input_value" in
      *..*)
        echo "FAIL: Path traversal in $input_name: '$input_value'"
        return 1
        ;;
    esac
    if [[ "$input_name" != "deploy_path" ]]; then
      case "$input_value" in
        /*|~*|'$'*|'${'*)
          echo "FAIL: Dangerous path pattern in $input_name: '$input_value'"
          return 1
          ;;
      esac
    fi
  fi
  echo "PASS: $input_name='$input_value'"
  return 0
}

# Helper: expect validation to REJECT input (should return 1)
expect_reject() {
  local input_name="$1"
  local input_value="$2"
  if validate_input "$input_name" "$input_value" >/dev/null 2>&1; then
    echo "UNEXPECTED PASS: $input_name='$input_value' should have been rejected"
    ((FAIL_COUNT++))
  else
    echo "OK (rejected): $input_name='$input_value'"
    ((PASS_COUNT++))
  fi
}

# Helper: expect validation to ACCEPT input (should return 0)
expect_accept() {
  local input_name="$1"
  local input_value="$2"
  if validate_input "$input_name" "$input_value" >/dev/null 2>&1; then
    echo "OK (accepted): $input_name='$input_value'"
    ((PASS_COUNT++))
  else
    echo "UNEXPECTED REJECT: $input_name='$input_value' should have been accepted"
    ((FAIL_COUNT++))
  fi
}

echo "=== Testing literal strings with $ (should be rejected) ==="
expect_reject "test1" '$HOME'
expect_reject "test2" '${USER}'
expect_reject "test3" '$(whoami)'
expect_reject "test4" '$(echo exploit)'

echo ""
echo "=== Testing strings that should PASS ==="
expect_accept "test5" "normal_path.txt"
expect_accept "test6" "docker-compose.yml"
expect_accept "deploy_path" "/opt/app"
expect_accept "deploy_path" "~/apps/myapp"

echo ""
echo "=== Testing absolute paths (should FAIL for non-deploy_path) ==="
expect_reject "test7" "/absolute/path"
expect_reject "test8" "~/home/path"

echo ""
echo "=== Testing path traversal (should FAIL) ==="
expect_reject "test9" "../../etc/passwd"
expect_reject "test10" "path/../etc"

echo ""
echo "========================================="
echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "========================================="

[ "$FAIL_COUNT" -eq 0 ]
