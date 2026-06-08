FROM docker:latest

LABEL 'name'='Docker Deployment Action'
LABEL 'com.github.actions.name'='Docker Deployment'
LABEL 'com.github.actions.description'='supports docker-compose and Docker Swarm deployments'
LABEL 'com.github.actions.icon'='send'
LABEL 'com.github.actions.color'='green'

# Install SSH client, curl and Docker Compose
RUN apk --no-cache add openssh-client curl \
    && curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose

COPY docker-entrypoint.sh /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
