FROM docker/compose:2.24.0

LABEL 'name'='Docker Deployment Action'
LABEL 'com.github.actions.name'='Docker Deployment'
LABEL 'com.github.actions.description'='supports docker-compose and Docker Swarm deployments'
LABEL 'com.github.actions.icon'='send'
LABEL 'com.github.actions.color'='green'

RUN apk --no-cache add openssh-client 

COPY docker-entrypoint.sh /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
