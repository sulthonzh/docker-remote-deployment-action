FROM docker:latest

LABEL 'name'='Docker Deployment Action'
LABEL 'com.github.actions.name'='Docker Deployment'
LABEL 'com.github.actions.description'='supports docker-compose and Docker Swarm deployments'
LABEL 'com.github.actions.icon'='send'
LABEL 'com.github.actions.color'='green'

# Install SSH client, curl and Docker Compose
RUN apk --no-cache add openssh-client curl \
    && curl -L "https://github.com/docker/compose/releases/download/v2.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose

# Create non-root user for security
RUN addgroup -g 1001 -S docker && \
    adduser -S docker -G docker -u 1001

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Switch to non-root user
USER docker

ENTRYPOINT ["/docker-entrypoint.sh"]