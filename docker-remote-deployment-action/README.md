# Docker Remote Deployment Action

A [GitHub Action](https://github.com/marketplace/actions/docker-remote-deployment) that supports docker-compose and Docker Swarm deployments on a remote host using SSH. Enhanced with security validation and robust error handling.

The Action is adapted from work by [wshihadeh](https://github.com/wshihadeh/docker-deployment-action) and [TapTap21](https://github.com/TapTap21/docker-remote-deployment-action)

## Features

- ✅ Enhanced security validation for all inputs
- ✅ Support for both docker-compose and Docker Swarm deployments
- ✅ Automatic SSH key management and cleanup
- ✅ Docker registry authentication
- ✅ Configurable docker system pruning
- ✅ File backup and rotation
- ✅ Comprehensive error handling

## Quick Start

### Basic Docker Compose Deployment

```yaml
- name: Deploy with Docker Compose
  uses: sulthonzh/docker-remote-deployment-action@v1
  with:
    remote_docker_host: user@server.com
    ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
    ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
    deployment_mode: docker-compose
    args: up -d
```

### Docker Swarm Deployment

```yaml
- name: Deploy to Docker Swarm
  uses: sulthonzh/docker-remote-deployment-action@v1
  with:
    remote_docker_host: user@server.com
    ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
    ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
    deployment_mode: docker-swarm
    args: my-app-stack
```

### Advanced Example with File Management

```yaml
- name: Advanced Deployment
  uses: sulthonzh/docker-remote-deployment-action@v1
  with:
    remote_docker_host: user@server.com
    ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
    ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
    deployment_mode: docker-compose
    copy_stack_file: true
    deploy_path: docker-deployment
    stack_file_name: docker-compose.prod.yaml
    keep_files: 5
    args: up -d --remove-orphans
    pre_deployment_command_args: build --no-cache
    pull_images_first: true
    docker_prune: true
```

## Input Configurations

### Required Inputs

- **`remote_docker_host`** (string) - Remote Docker host in format `user@host`. Cannot contain shell metacharacters or start with `/`.
- **`ssh_private_key`** (string) - SSH private key for authentication. Should be stored as a GitHub secret.
- **`ssh_public_key`** (string) - SSH public key for authentication. Should be stored as a GitHub secret.
- **`args`** (string) - Deployment command arguments (e.g., `up -d`, `deploy my-app`).

### Optional Inputs

- **`remote_docker_port`** (string, default: `22`) - SSH port for the remote host.
- **`deployment_mode`** (choice, default: `docker-compose`) - Either `docker-compose` or `docker-swarm`.
- **`copy_stack_file`** (boolean, default: `false`) - Copy stack file to remote server before deployment.
- **`deploy_path`** (string, default: `docker-deployment`) - Path for deployment files on remote server (max 255 chars, cannot start with `/`).
- **`stack_file_name`** (string, default: `docker-compose.yaml`) - Name of the stack file (must end with `.yaml` or `.yml`).
- **`keep_files`** (number, default: `3`) - Number of backup files to retain.
- **`docker_prune`** (boolean, default: `false`) - Run `docker system prune` after deployment (destructive operation).
- **`pre_deployment_command_args`** (string) - Commands to run before deployment (restricted to safe operations).
- **`pull_images_first`** (boolean, default: `false`) - Pull images before deployment.
- **`docker_registry_username`** (string) - Registry username for private registries.
- **`docker_registry_password`** (string) - Registry password (use GitHub secrets).
- **`docker_registry_uri`** (string, default: `https://registry.hub.docker.com`) - Registry URI.

## Security Considerations

### Input Validation

All inputs are validated for:
- Shell metacharacters that could cause command injection
- Path traversal attempts (`../`)
- Empty or invalid values
- File extensions and path formats
- Potentially dangerous commands

### Key Management

- SSH keys are stored in temporary files and cleaned up automatically
- Keys are never logged or exposed in output
- SSH agent is properly terminated on exit

### Docker Security

- `docker_prune` includes a 10-second countdown before execution
- Only containers older than 7 days are pruned by default
- Registry credentials are handled via temporary files

## Troubleshooting

### Common Issues

**SSH Connection Failures**
- Verify SSH keys are correctly formatted
- Check that the remote host accepts connections on specified port
- Ensure user has proper Docker permissions

**Deployment Failures**
- Stack files must be in valid YAML format
- Docker Compose version compatibility issues
- Network and volume configuration problems

**Input Validation Errors**
- Remove any shell metacharacters from inputs
- Ensure file paths don't start with `/`
- Validate stack file extensions are `.yaml` or `.yml`

### Debug Mode

Enable debug logging by adding `--log-level debug` to your deployment command.

### Environment Variables

The action automatically sets up the Docker context and SSH environment. Ensure your remote host has:
- Docker installed and running
- SSH server enabled
- Proper file permissions for deployment user

## Examples

See the [Quick Start](#quick-start) section for basic usage examples.

For more complex deployments, see the [Advanced Example](#advanced-example-with-file-management).

## Contributing

Contributions are welcome! Please ensure:

1. All new inputs include proper validation
2. Security tests are updated
3. Documentation is current
4. Changes follow existing code style

## License

This project is licensed under the MIT License.

