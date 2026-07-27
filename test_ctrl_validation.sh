#!/bin/bash
# Test control character validation
# Tracks pass/fail counts and exits non-zero if any test expectation is wrong

PASS_COUNT=0
FAIL_COUNT=0

validate_input() {
  local input_name="$1"
  local input_value="$2"
  
  # Check for control characters using tr + wc
  ctrl_count=$(printf '%s' "$input_value" | tr -d '[:cntrl:]' | wc -c)
  ctrl_count=$((${#input_value} - ctrl_count))
  if [ "$ctrl_count" -gt 0 ]; then
    echo "REJECT: $input_name contains control characters (count: $ctrl_count)"
    return 1
  fi
  
  echo "ACCEPT: $input_name"
  return 0
}

# Helper: expect validation to REJECT input (should return 1)
expect_reject() {
  local input_name="$1"
  local input_value="$2"
  if validate_input "$input_name" "$input_value" >/dev/null 2>&1; then
    echo "UNEXPECTED PASS: $input_name should have been rejected"
    ((FAIL_COUNT++))
  else
    echo "OK (rejected): $input_name"
    ((PASS_COUNT++))
  fi
}

# Helper: expect validation to ACCEPT input (should return 0)
expect_accept() {
  local input_name="$1"
  local input_value="$2"
  if validate_input "$input_name" "$input_value" >/dev/null 2>&1; then
    echo "OK (accepted): $input_name"
    ((PASS_COUNT++))
  else
    echo "UNEXPECTED REJECT: $input_name should have been accepted"
    ((FAIL_COUNT++))
  fi
}

echo "Testing control character detection:"
echo "---"
expect_accept "normal" "normal text"
expect_reject "with_tab" $'textwith\ttab'
expect_reject "with_newline" $'textwith\nnewline'
expect_reject "with_carriage_return" $'textwith\rCR'

echo ""
echo "========================================="
echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "========================================="

[ "$FAIL_COUNT" -eq 0 ]
