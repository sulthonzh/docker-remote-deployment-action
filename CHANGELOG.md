# Changelog

## [Unreleased]

### Fixed
- Path traversal via `stack_file_name` input (security)
- SC2086 word splitting on `PRUNE_FLAGS` (security)
- Control character validation non-functional on BusyBox/Alpine grep
- Control character validation incorrectly rejected valid inputs containing spaces — fixed to use `[:cntrl:]` class instead of inverse `[:print:]` (which excludes spaces)
- Validate `prune_volumes` input to prevent unintended destructive operations
- Docker Compose version bump v2.30.3 → v2.40.3 (CVE fixes, latest stable)
- Predictable remote password filename — now uses `$RANDOM` + PID suffix to prevent collision race condition between concurrent CI runners
- Cleanup quoting inconsistency in remote password file removal
- Boolean input validation for `docker_prune`, `copy_stack_file`, `pull_images_first` to prevent silent failures on invalid values

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
