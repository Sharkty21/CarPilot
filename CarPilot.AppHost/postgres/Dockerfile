FROM pgvector/pgvector:pg17

# Bake init scripts into the image so Azure Container Apps does not rely on
# empty bind-mount Azure Files shares (local WithInitFiles paths are not uploaded).
COPY postgres-init/ /docker-entrypoint-initdb.d/
COPY postgres/entrypoint.sh /usr/local/bin/carpilot-pg-entrypoint.sh
RUN chmod +x /docker-entrypoint-initdb.d/*.sh /usr/local/bin/carpilot-pg-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/carpilot-pg-entrypoint.sh"]
CMD ["postgres"]
