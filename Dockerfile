FROM docker/compose:v2.24.5

# v2 uses 'docker compose' (space) instead of 'docker-compose' (hyphen).
# Create symlink for backward compat with existing scripts.
RUN ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose || true

LABEL 'name'='Docker Deployment Action'
LABEL 'com.github.actions.name'='Docker Deployment'
LABEL 'com.github.actions.description'='supports docker-compose and Docker Swarm deployments'
LABEL 'com.github.actions.icon'='send'
LABEL 'com.github.actions.color'='green'

RUN apk --no-cache add openssh-client 

COPY docker-entrypoint.sh /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
