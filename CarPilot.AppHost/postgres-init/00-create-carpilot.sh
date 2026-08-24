#!/bin/bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	SELECT 'CREATE DATABASE carpilot'
	WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'carpilot')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "carpilot" <<-EOSQL
	CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
