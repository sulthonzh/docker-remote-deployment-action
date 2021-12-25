# Docker Remote Deployment Action

A [GitHub Action](https://github.com/marketplace/actions/docker-remote-deployment) that supports docker-compose and Docker Swarm deployments on a remote host using SSH.

The Action is adapted from work by [wshihadeh](https://github.com/wshihadeh/docker-deployment-action) and [TapTap21](https://github.com/TapTap21/docker-remote-deployment-action)

## Example

Below is a brief example on how the action can be used:

```yaml
- name: Deploy to Docker swarm
  uses: sulthonzh/docker-remote-deployment-action@v1
  with:
    remote_docker_host: user@host
    ssh_private_key: ${{ secrets.SSH_PRIVATE_KEY }}
    ssh_public_key: ${{ secrets.SSH_PUBLIC_KEY }}
    deployment_mode: docker-swarm
    copy_stack_file: true
    deploy_path: /root/my-deployment
    stack_file_name: docker-compose.yaml
    keep_files: 5
    args: my_applicaion
```

## Input Configurations
### `remote_docker_host`
  Remote Docker host ie (user@host).
### `remote_docker_port`
  Remote Docker ssh port ie (22).
### `ssh_public_key`
  Remote Docker SSH public key eg (~/.ssh/rsa_id.pub).
### `ssh_private_key`
  SSH private key used to connect to the docker host eg (~/.ssh/rsa_id).
### `args`
  Deployment command args.
### `deployment_mode`
  Deployment mode either docker-swarm or docker-compose. Default is docker-compose.
### `copy_stack_file`
  Copy stack file to remote server and deploy from the server. Default is false.
### `deploy_path`
  The path where the stack files will be copied to. Default ~/docker-deployment.
### `stack_file_name`
  Docker stack file used. Default is docker-compose.yml.
### `keep_files`
  Number of the files to be kept on the server. Default is 3.
### `docker_prune`
  A boolean input to trigger docker prune command. Default is false.
### `pre_deployment_command_args`
  The args for the pre deploument command.
### `pull_images_first`
  Pull docker images before deploying. Default is false.
### `docker_registry_username`
  The docker registry username.
### `docker_registry_password`
  The docker registry password.
### `docker_registry_uri`
  The docker registry URI. Default is https://registry.hub.docker.com.

