"""Request-scoped bearer token for .NET API calls from tools."""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar, Token
from typing import Iterator

_access_token: ContextVar[str | None] = ContextVar("carpilot_access_token", default=None)


def get_access_token() -> str | None:
    return _access_token.get()


def set_access_token(token: str | None) -> Token:
    return _access_token.set(token)


def reset_access_token(token: Token) -> None:
    _access_token.reset(token)


@contextmanager
def access_token_scope(token: str | None) -> Iterator[None]:
    handle = set_access_token(token)
    try:
        yield
    finally:
        reset_access_token(handle)
