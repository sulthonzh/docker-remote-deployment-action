# Docker Remote Deployment Action

A [GitHub Action](https://github.com/marketplace/actions/docker-remote-deployment) that supports docker-compose and Docker Swarm deployments on a remote host using SSH. Enhanced with security improvements, better error handling, and comprehensive testing.

## Features

- **Security Enhanced**: Input validation, path traversal protection, and safe command execution
- **Multiple Deployment Modes**: Support for both Docker Compose and Docker Swarm
- **Registry Integration**: Automatic login to private registries
- **File Management**: Automatic cleanup of old deployment files
- **Error Handling**: Comprehensive error handling and logging
- **Non-Interactive**: Fully automated without interactive prompts
- **Testing**: Built-in test suite for validation

## Example

### Docker Compose Deployment

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Docker host
        uses: sulthonzh/docker-remote-deployment-action@v1
        with:
          remote_docker_host: ${{ secrets.REMOTE_HOST }}
          ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
          ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
          deployment_mode: docker-compose
          copy_stack_file: true
          deploy_path: /root/my-app
          stack_file_name: docker-compose.yml
          keep_files: 5
          args: -d production
```

### Docker Swarm Deployment

```yaml
name: Deploy to Swarm
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Docker Swarm
        uses: sulthonzh/docker-remote-deployment-action@v1
        with:
          remote_docker_host: ${{ secrets.REMOTE_HOST }}
          ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
          ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
          deployment_mode: docker-swarm
          copy_stack_file: true
          deploy_path: /root/my-swarm
          stack_file_name: docker-stack.yml
          keep_files: 10
          args: my-app-stack
```

### With Private Registry

```yaml
name: Deploy with Private Registry
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to private registry
        uses: sulthonzh/docker-remote-deployment-action@v1
        with:
          remote_docker_host: ${{ secrets.REMOTE_HOST }}
          ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
          ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
          deployment_mode: docker-compose
          docker_registry_username: ${{ secrets.REGISTRY_USERNAME }}
          docker_registry_password: ${{ secrets.REGISTRY_PASSWORD }}
          docker_registry_uri: https://registry.example.com
          args: -d production
```

## Input Configurations

### Required Inputs

| Input | Description | Default |
|-------|------------|---------|
| `remote_docker_host` | Remote Docker host (user@host) | Required |
| `ssh_public_key` | SSH public key | Required |
| `ssh_private_key` | SSH private key | Required |
| `args` | Deployment command args | Required |

### Optional Inputs

| Input | Description | Default |
|-------|------------|---------|
| `remote_docker_port` | Remote SSH port | `22` |
| `deployment_mode` | `docker-compose` or `docker-swarm` | `docker-compose` |
| `copy_stack_file` | Copy stack file to remote server | `false` |
| `deploy_path` | Deployment path on remote server | `~/docker-deployment` |
| `stack_file_name` | Stack file name | `docker-compose.yml` |
| `keep_files` | Number of files to keep | `4` |
| `docker_prune` | Run docker system prune | `false` |
| `pre_deployment_command_args` | Pre-deployment commands | |
| `pull_images_first` | Pull images before deploying | `false` |
| `docker_registry_username` | Registry username | |
| `docker_registry_password` | Registry password | |
| `docker_registry_uri` | Registry URI | `https://registry.hub.docker.com` |

## Security Features

### Input Validation
- **Shell Injection Protection**: Blocks shell metacharacters (`;`, `|`, `&`, etc.)
- **Path Traversal Protection**: Blocks `../` sequences in file paths
- **Numeric Validation**: Ensures port and file count inputs are valid numbers

### SSH Security
- **Strict Host Key Checking**: Disables for automation (controlled environment)
- **Key Management**: Secure handling of SSH keys with proper permissions
- **Connection Cleanup**: Automatic cleanup of SSH connections and contexts

### Docker Security
- **Non-root User**: Runs as non-root user for reduced attack surface
- **Secure Password Handling**: Uses temporary files for registry passwords
- **Context Management**: Proper cleanup of Docker contexts

## Error Handling

The action includes comprehensive error handling for:

- SSH connection failures
- Docker context creation failures
- Registry authentication failures
- File transfer operations
- Deployment command execution

All errors are logged with clear messages, and the action exits with appropriate error codes.

## Testing

The action includes a comprehensive test suite that validates:

- Action.yml syntax and structure
- Docker image build process
- Shell script syntax
- Input validation functions
- Environment variable handling
- Security checks

Tests run automatically on push and pull requests.

## Best Practices

### Security
1. **Use SSH Keys**: Always use SSH keys instead of passwords
2. **Restrict Host Access**: Only allow trusted hosts in your SSH configuration
3. **Use Private Registries**: Store registry credentials as secrets
4. **Limit Permissions**: Use the least privilege necessary for deployment

### Performance
1. **Use Copy Stack File**: Set `copy_stack_file: true` for better performance
2. **Pull Images First**: Use `pull_images_first: true` to reduce deployment time
3. **Manage File Count**: Adjust `keep_files` based on your storage needs

### Monitoring
1. **Enable Logging**: Use debug logging for troubleshooting
2. **Check Status**: Monitor deployment status through GitHub Actions logs
3. **Review Prune Operations**: Use `docker_prune` carefully in production

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify SSH keys are correctly formatted
   - Check host connectivity and port access
   - Ensure user has proper permissions

2. **Docker Context Creation Failed**
   - Verify Docker is installed on the remote host
   - Check SSH connectivity to Docker daemon
   - Ensure user is in the docker group

3. **Registry Authentication Failed**
   - Verify registry credentials
   - Check registry URL and connectivity
   - Ensure registry allows access from your IP

4. **Deployment Failed**
   - Check stack file syntax
   - Verify image availability
   - Review deployment logs on the remote host

### Debug Mode

Enable debug logging by adding `--log-level debug` to your deployment command or setting the appropriate input parameter.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Changelog

### v1.1.0
- Enhanced security with input validation
- Added comprehensive test suite
- Improved error handling
- Updated Docker Compose to v2.29.2
- Added non-root user support
- Fixed interactive prompt issue

### v1.0.0
- Initial release with basic Docker deployment functionality