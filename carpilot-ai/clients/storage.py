"""S3-compatible object storage client (RustFS locally, Railway buckets in prod)."""

from __future__ import annotations

from functools import lru_cache
from typing import BinaryIO

import boto3
from botocore.client import Config

from config import get_settings


@lru_cache
def get_s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.storage_endpoint,
        aws_access_key_id=settings.storage_access_key,
        aws_secret_access_key=settings.storage_secret_key,
        region_name=settings.storage_region,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def upload_bytes(
    *,
    key: str,
    body: bytes,
    content_type: str | None = None,
) -> str:
    settings = get_settings()
    extra: dict[str, str] = {}
    if content_type:
        extra["ContentType"] = content_type
    get_s3_client().put_object(
        Bucket=settings.storage_bucket,
        Key=key,
        Body=body,
        **extra,
    )
    return key


def upload_fileobj(
    *,
    key: str,
    fileobj: BinaryIO,
    content_type: str | None = None,
) -> str:
    settings = get_settings()
    extra: dict[str, str] = {}
    if content_type:
        extra["ContentType"] = content_type
    get_s3_client().upload_fileobj(
        fileobj,
        settings.storage_bucket,
        key,
        ExtraArgs=extra or None,
    )
    return key


def generate_presigned_url(key: str, expires_in: int = 3600) -> str:
    settings = get_settings()
    return get_s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.storage_bucket, "Key": key},
        ExpiresIn=expires_in,
    )
