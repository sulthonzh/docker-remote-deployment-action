# Docker Remote Deployment Action

A [GitHub Action](https://github.com/marketplace/actions/docker-remote-deployment) that supports docker-compose and Docker Swarm deployments on a remote host using SSH. Built with security in mind and includes comprehensive input validation.

The Action is adapted from work by [wshihadeh](https://github.com/wshihadeh/docker-deployment-action) and [TapTap21](https://github.com/TapTap21/docker-remote-deployment-action)

## Features

- 🔒 Secure SSH key handling with automatic cleanup
- 🐳 Support for both Docker Compose and Docker Swarm
- 📋 Automatic stack file management with version rotation
- 🔍 Built-in input validation to prevent shell injection
- 🧹 Optional Docker system prune for cleanup
- 🏷️ Private Docker registry support
- 📝 Comprehensive logging and error handling

## Quick Start

### Basic Docker Compose Deployment

```yaml
- name: Deploy Docker Compose
  uses: sulthonzh/docker-remote-deployment-action@v1
  with:
    remote_docker_host: user@server.com
    ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
    ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
    args: up -d
```

> **Note:** The action automatically passes `-f <stack_file_name>` to docker-compose. Use the `stack_file_name` input to specify a custom compose file — do **not** pass `-f` in `args`, or Docker Compose will receive two `-f` flags and attempt to merge non-existent files.

## Examples

### Docker Compose Deployment

```yaml
- name: Deploy with Docker Compose
  uses: sulthonzh/docker-remote-deployment-action@v1
  with:
    remote_docker_host: ubuntu@production.com
    ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
    ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
    args: up -d
    deployment_mode: docker-compose
    copy_stack_file: true
    deploy_path: /opt/deployments/my-app
    stack_file_name: docker-compose.prod.yml
    keep_files: 5
    pull_images_first: true
```

### Docker Swarm Deployment

```yaml
- name: Deploy to Docker Swarm
  uses: sulthonzh/docker-remote-deployment-action@v1
  with:
    remote_docker_host: admin@swarm-cluster.com
    ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
    ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
    args: my-app-stack
    deployment_mode: docker-swarm
    copy_stack_file: true
    deploy_path: /opt/swarm-deployments
    stack_file_name: production-stack.yml
    keep_files: 7
    docker_prune: true
```

### Private Registry Deployment

```yaml
- name: Deploy with Private Registry
  uses: sulthonzh/docker-remote-deployment-action@v1
  with:
    remote_docker_host: deploy@registry.com
    ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
    ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
    args: up -d
    stack_file_name: docker-compose.yml
    copy_stack_file: true
    docker_registry_username: ${{ secrets.REGISTRY_USERNAME }}
    docker_registry_password: ${{ secrets.REGISTRY_PASSWORD }}
    docker_registry_uri: https://registry.mycompany.com
```

### Advanced Configuration with Pre-deployment Commands

```yaml
- name: Advanced deployment with validation
  uses: sulthonzh/docker-remote-deployment-action@v1
  with:
    remote_docker_host: ubuntu@server.com
    ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
    ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
    args: up -d
    deployment_mode: docker-compose
    copy_stack_file: true
    pre_deployment_command_args: config
    deploy_path: /opt/deployments/my-service
    stack_file_name: docker-compose.yml
    keep_files: 10
```

## Security Features

### Input Validation

The action includes comprehensive input validation to prevent:
- Shell injection attacks
- Path traversal attempts
- Invalid port numbers
- Malicious command sequences

### SSH Key Management

- SSH keys are automatically cleaned up after deployment
- Temporary files with credentials are securely removed
- SSH agent is properly terminated

### Docker Context Security

- Remote docker contexts are properly isolated
- Existing contexts are removed to prevent conflicts
- Secure authentication to private registries
- When `copy_stack_file=true`, registry login is performed on the remote host too (deployment runs via SSH, so the remote Docker daemon needs its own credentials)

## Input Configurations

### Required Inputs

#### `remote_docker_host`
- **Description**: Remote Docker host (format: user@host)
- **Required**: true
- **Example**: `ubuntu@server.com`

#### `ssh_public_key`
- **Description**: SSH public key content
- **Required**: true
- **Example**: `${{ secrets.SSH_PUBLIC_KEY }}`

#### `ssh_private_key`
- **Description**: SSH private key content
- **Required**: true
- **Example**: `${{ secrets.SSH_PRIVATE_KEY }}`

#### `args`
- **Description**: Deployment command arguments
- **Required**: true
- **Example**: `up -d` for docker-compose, `my_stack` for swarm (stack name only — `stack deploy` is already included in the command)

### Optional Inputs

#### `remote_docker_port`
- **Description**: SSH port for remote host
- **Required**: false
- **Default**: `22`
- **Example**: `2222`

#### `deployment_mode`
- **Description**: Deployment mode
- **Required**: false
- **Default**: `docker-compose`
- **Options**: `docker-compose`, `docker-swarm`
- **Example**: `docker-swarm`

#### `copy_stack_file`
- **Description**: Copy stack file to remote server before deployment
- **Required**: false
- **Default**: `false`
- **Example**: `true`

#### `deploy_path`
- **Description**: Path where stack files are copied on remote server
- **Required**: false
- **Default**: `~/docker-deployment`
- **Example**: `/opt/deployments`

#### `stack_file_name`
- **Description**: Name of the docker-compose stack file
- **Required**: false
- **Default**: `docker-compose.yml`
- **Example**: `production.yml`

#### `keep_files`
- **Description**: Total number of stack file versions to keep, including the currently deployed file (when copy_stack_file=true). Example: `keep_files=4` retains the current version plus up to 3 previous versions.
- **Required**: false
- **Default**: `4`
- **Example**: `5` (keeps current + 4 previous versions)

#### `docker_prune`
- **Description**: Automatically run docker system prune after deployment
- **Required**: false
- **Default**: `false`
- **Example**: `true`
- **⚠️ Warning**: This is destructive and removes unused images, containers, and networks. By default it does NOT remove volumes.

#### `pre_deployment_command_args`
- **Description**: Arguments for pre-deployment command (docker-compose mode only). Runs before image pulling and deployment, allowing early validation (e.g., `config` to verify the compose file). Works regardless of `copy_stack_file` setting.
- **Required**: false
- **Example**: `config`

#### `pull_images_first`
- **Description**: Pull images before deployment (docker-compose mode only). Works regardless of `copy_stack_file` setting.
- **Required**: false
- **Default**: `false`
- **Example**: `true`

#### `docker_registry_username`
- **Description**: Docker registry username
- **Required**: false
- **Example**: `my-registry-user`

#### `docker_registry_password`
- **Description**: Docker registry password
- **Required**: false
- **Example**: `${{ secrets.DOCKER_REGISTRY_PASSWORD }}`

#### `docker_registry_uri`
- **Description**: Docker registry URI
- **Required**: false
- **Default**: `https://registry.hub.docker.com`
- **Example**: `https://registry.mycompany.com`

