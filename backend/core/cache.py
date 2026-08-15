"""Redis cache with in-memory fallback and TTL."""
import json
import logging
import os
import time
from typing import Any, Optional, Tuple

logger = logging.getLogger(__name__)

_redis = None
_memory_cache: dict[str, Tuple[Any, float]] = {}


def _get_redis():
    global _redis
    if _redis is not None:
        return _redis
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        return None
    try:
        import redis
        _redis = redis.from_url(redis_url, decode_responses=True)
        _redis.ping()
        logger.info("Redis connected")
        return _redis
    except Exception as e:
        logger.warning("Redis unavailable, using memory cache: %s", e)
        return None


def _purge_expired_memory():
    now = time.time()
    expired = [k for k, (_, exp) in _memory_cache.items() if exp <= now]
    for key in expired:
        _memory_cache.pop(key, None)


async def cache_get(key: str) -> Optional[Any]:
    r = _get_redis()
    if r:
        try:
            val = r.get(key)
            return json.loads(val) if val else None
        except Exception:
            pass
    _purge_expired_memory()
    entry = _memory_cache.get(key)
    if not entry:
        return None
    value, expiry = entry
    if expiry <= time.time():
        _memory_cache.pop(key, None)
        return None
    return value


async def cache_set(key: str, value: Any, ttl_seconds: int = 300):
    r = _get_redis()
    if r:
        try:
            r.setex(key, ttl_seconds, json.dumps(value, default=str))
            return
        except Exception:
            pass
    _memory_cache[key] = (value, time.time() + ttl_seconds)


async def cache_delete(key: str):
    r = _get_redis()
    if r:
        try:
            r.delete(key)
        except Exception:
            pass
    _memory_cache.pop(key, None)
