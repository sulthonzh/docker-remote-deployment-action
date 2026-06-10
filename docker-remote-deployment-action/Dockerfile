FROM docker:24-docker

LABEL 'name'='Docker Deployment Action'
LABEL 'com.github.actions.name'='Docker Deployment'
LABEL 'com.github.actions.description'='supports docker-compose and Docker Swarm deployments'
LABEL 'com.github.actions.icon'='send'
LABEL 'com.github.actions.color'='green'
LABEL 'version'='1.2.0'
LABEL 'maintainer'='sulthonzh'

# Install SSH client, curl and Docker Compose
RUN apk --no-cache add --no-cache openssh-client curl tar gzip \
    && apk add --no-cache docker-cli-compose

# Create a non-root user for security
RUN addgroup -g 1001 -S docker \
    && adduser -S docker -u 1001 -G docker

# Set proper permissions for the entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Switch to non-root user
USER docker

ENTRYPOINT ["/docker-entrypoint.sh"]
