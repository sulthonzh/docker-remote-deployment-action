#!/bin/bash

# Read all lines
lines=()
while IFS= read -r line; do
    lines+=("$line")
done < docker-entrypoint.sh

# Replace line 50 (index 49)
lines[49]="  if printf '%s' \"\$input_value\" | grep -qE \"[;&|\\\\\\\\\\\\`\\\\\\\\\\\\$()\\\"\\\"\\\"<>{}/]|[[:space:]]\"; then"

# Write back
printf "%s\n" "${lines[@]}" > docker-entrypoint.sh