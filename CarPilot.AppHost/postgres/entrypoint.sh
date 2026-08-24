#!/bin/bash
set -euo pipefail

create_missing_dbs() {
  local user="${POSTGRES_USER:-postgres}"
  export PGPASSWORD="${POSTGRES_PASSWORD:-}"
  until pg_isready -U "$user" -h localhost >/dev/null 2>&1; do
    sleep 1
  done

  psql -v ON_ERROR_STOP=1 -h localhost --username "$user" --dbname postgres <<-EOSQL
	SELECT 'CREATE DATABASE carpilot'
	WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'carpilot')\gexec
EOSQL

  psql -v ON_ERROR_STOP=1 -h localhost --username "$user" --dbname carpilot -c "CREATE EXTENSION IF NOT EXISTS vector;"
}

docker-entrypoint.sh "$@" &
pid=$!
trap 'kill -TERM "$pid" 2>/dev/null || true; wait "$pid"' TERM INT
create_missing_dbs || true
wait "$pid"
