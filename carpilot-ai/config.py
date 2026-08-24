"""Application settings — all values come from environment variables."""

from __future__ import annotations

from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# ACA Postgres has no TLS. Keep only params both asyncpg and psycopg accept
# in a shared DSN (asyncpg rejects gssencmode as an unknown server setting).
_PG_CLIENT_PARAMS = {
    "sslmode": "disable",
}


def _with_postgres_client_params(url: str) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    for key, value in _PG_CLIENT_PARAMS.items():
        query.setdefault(key, value)
    return urlunparse(parsed._replace(query=urlencode(query)))


def _npgsql_to_asyncpg_url(value: str) -> str:
    """Convert an Npgsql-style connection string to a postgresql:// URL if needed."""
    if value.startswith(("postgresql://", "postgres://", "postgresql+asyncpg://")):
        converted = value.replace("postgresql+asyncpg://", "postgresql://", 1)
        return _with_postgres_client_params(converted)

    parts: dict[str, str] = {}
    for segment in value.split(";"):
        segment = segment.strip()
        if not segment or "=" not in segment:
            continue
        key, raw = segment.split("=", 1)
        parts[key.strip().lower()] = raw.strip()

    host = parts.get("host") or parts.get("server")
    database = parts.get("database") or parts.get("db")
    username = parts.get("username") or parts.get("user") or parts.get("userid")
    password = parts.get("password") or parts.get("pwd")
    port = parts.get("port", "5432")

    if not (host and database and username):
        return value

    userinfo = username if not password else f"{username}:{password}"
    return _with_postgres_client_params(f"postgresql://{userinfo}@{host}:{port}/{database}")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(validation_alias="DATABASE_URL")
    langchain_api_key: str = Field(default="", validation_alias="LANGCHAIN_API_KEY")
    langchain_project: str = Field(
        default="carpilot-ai-dev",
        validation_alias="LANGCHAIN_PROJECT",
    )
    langchain_tracing_v2: bool = Field(
        default=True,
        validation_alias="LANGCHAIN_TRACING_V2",
    )
    openai_api_key: str = Field(default="", validation_alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", validation_alias="OPENAI_MODEL")
    openai_embedding_model: str = Field(
        default="text-embedding-3-small",
        validation_alias="OPENAI_EMBEDDING_MODEL",
    )

    storage_endpoint: str = Field(validation_alias="STORAGE_ENDPOINT")
    storage_access_key: str = Field(validation_alias="STORAGE_ACCESS_KEY")
    storage_secret_key: str = Field(validation_alias="STORAGE_SECRET_KEY")
    storage_bucket: str = Field(validation_alias="STORAGE_BUCKET")
    storage_region: str = Field(default="us-east-1", validation_alias="STORAGE_REGION")

    dotnet_api_base_url: str = Field(validation_alias="DOTNET_API_BASE_URL")
    environment: str = Field(default="dev", validation_alias="ENVIRONMENT")

    vector_top_k: int = Field(default=5, validation_alias="VECTOR_TOP_K")
    chunk_size: int = Field(default=800, validation_alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=120, validation_alias="CHUNK_OVERLAP")

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if isinstance(value, str) and value:
            return _npgsql_to_asyncpg_url(value)
        return value

    @field_validator("dotnet_api_base_url", mode="before")
    @classmethod
    def strip_trailing_slash(cls, value: object) -> object:
        if isinstance(value, str):
            return value.rstrip("/")
        return value

    @field_validator("environment", mode="before")
    @classmethod
    def normalize_environment(cls, value: object) -> object:
        if isinstance(value, str):
            cleaned = value.strip().lower()
            if cleaned in {"development", "local"}:
                return "dev"
            if cleaned in {"production"}:
                return "prod"
            return cleaned
        return value

    @property
    def langsmith_project(self) -> str:
        """Prefer explicit LANGCHAIN_PROJECT; otherwise derive from environment."""
        if self.langchain_project:
            return self.langchain_project
        return f"carpilot-ai-{self.environment}"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


# Convenience for modules that import `settings` at load time in tests with env set.
def __getattr__(name: str):
    if name == "settings":
        return get_settings()
    raise AttributeError(name)
