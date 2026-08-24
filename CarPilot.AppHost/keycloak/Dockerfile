FROM quay.io/keycloak/keycloak:26.6
COPY ./Realms/*.json /opt/keycloak/data/import/
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--import-realm", "--http-enabled=true", "--hostname-strict=false"]
