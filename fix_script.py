#!/usr/bin/env python3

import re

# Read the file
with open('docker-entrypoint.sh', 'r') as f:
    content = f.read()

# Fix the problematic line
old_pattern = '  if [[ "$input_value" =~ [;&|`$()"\'\'] ]]; then'
new_pattern = '  if echo "$input_value" | grep -qE \'[;&|`$\()\\\"\'\'\'\']; then'

if old_pattern in content:
    content = content.replace(old_pattern, new_pattern)
    print("Fixed the problematic line")
else:
    print("Pattern not found, checking for alternative...")
    # Try alternative pattern
    alt_pattern = '  if [[ "$input_value" =~ [;&|`$"\'\'() ]]; then'
    if alt_pattern in content:
        content = content.replace(alt_pattern, new_pattern)
        print("Fixed alternative pattern")
    else:
        print("Pattern not found in either form")

# Write back
with open('docker-entrypoint.sh', 'w') as f:
    f.write(content)