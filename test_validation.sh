#!/bin/bash

# Test script to validate the pattern matching

validate_input() {
  local input_name="$1"
  local input_value="$2"
  
  # Check for control characters
  case "$input_value" in
    *$'\n'*|*$'\r'*|*$'\t'*|*$'\000'*)
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

# Test cases
echo "=== Testing literal strings with $ ==="
validate_input "test1" '$HOME' 
validate_input "test2" '${USER}'
validate_input "test3" '$(whoami)'
validate_input "test4" '$(echo exploit)'

echo ""
echo "=== Testing strings that should PASS ==="
validate_input "test5" "normal_path.txt"
validate_input "test6" "docker-compose.yml"
validate_input "deploy_path" "/opt/app"
validate_input "deploy_path" "~/apps/myapp"

echo ""
echo "=== Testing absolute paths (should FAIL for non-deploy_path) ==="
validate_input "test7" "/absolute/path"
validate_input "test8" "~/home/path"

echo ""
echo "=== Testing path traversal (should FAIL) ==="
validate_input "test9" "../../etc/passwd"
validate_input "test10" "path/../etc"

