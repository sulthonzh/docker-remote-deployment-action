with open('docker-entrypoint.sh', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'grep -qE' in line and '[\\\\]\\\'' in line:
        lines[i] = '  if printf \'%s\' "$input_value" | grep -qE "[;&|\\\\\\\\`\\\\\\\\$()\\\"\\\"\\\"<>{}/]|[[:space:]]"; then\n'
        break

with open('docker-entrypoint.sh', 'w') as f:
    f.writelines(lines)