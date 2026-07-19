# Changelog

## [Unreleased]

### Fixed
- Path traversal via `stack_file_name` input (security)
- SC2086 word splitting on `PRUNE_FLAGS` (security)
- Control character validation non-functional on BusyBox/Alpine grep
- Control character validation incorrectly rejected valid inputs containing spaces — fixed to use `[:cntrl:]` class instead of inverse `[:print:]` (which excludes spaces)
- Validate `prune_volumes` input to prevent unintended destructive operations

## [1.0.0] - 2026-06-15

### Added
- Initial release of Docker Remote Deployment Action
- Secure GitHub Action for Docker Compose and Docker Swarm deployments via SSH
- Input validation and sanitization
- Automatic cleanup support
- Private registry authentication
- SCP file transfer
- Docker Compose stack deployment
- Docker Swarm service deployment
