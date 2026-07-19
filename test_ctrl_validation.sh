#!/bin/bash
# Test control character validation

validate_input() {
  local input_name="$1"
  local input_value="$2"
  
  # Check for control characters using tr + wc
  ctrl_count=$(printf '%s' "$input_value" | tr -d '[:cntrl:]' | wc -c)
  ctrl_count=$((${#input_value} - ctrl_count))
  if [ "$ctrl_count" -gt 0 ]; then
    echo "FAIL: $input_name contains control characters (count: $ctrl_count)"
    return 1
  fi
  
  echo "PASS: $input_name"
  return 0
}

echo "Testing control character detection:"
echo "---"
validate_input "normal" "normal text"
validate_input "with_tab" $'textwith	tab'
validate_input "with_newline" $'textwith
newline'
validate_input "with_carriage_return" $'textwith\rCR'
