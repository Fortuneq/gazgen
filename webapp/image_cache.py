"""
In-memory LRU cache for images served from the database.

Caches raw bytes + content_type to avoid repeated BYTEA reads from PostgreSQL.
Default: up to 512 entries (~250 MB assuming ~500 KB avg image).
TTL: 1 hour — after that, entry is evicted on next access.
"""
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Optional


@dataclass(slots=True)
class _CacheEntry:
    data: bytes
    content_type: str
    created_at: float


class ImageCache:
    def __init__(self, max_size: int = 512, ttl_seconds: int = 3600):
        self._cache: OrderedDict[str, _CacheEntry] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds

    def get(self, key: str) -> Optional[tuple[bytes, str]]:
        entry = self._cache.get(key)
        if entry is None:
            return None
        if time.monotonic() - entry.created_at > self._ttl:
            del self._cache[key]
            return None
        # Move to end (most recently used)
        self._cache.move_to_end(key)
        return (entry.data, entry.content_type)

    def put(self, key: str, data: bytes, content_type: str) -> None:
        if key in self._cache:
            self._cache.move_to_end(key)
            self._cache[key] = _CacheEntry(data, content_type, time.monotonic())
            return
        if len(self._cache) >= self._max_size:
            self._cache.popitem(last=False)  # evict oldest
        self._cache[key] = _CacheEntry(data, content_type, time.monotonic())

    def clear(self) -> None:
        self._cache.clear()

    @property
    def size(self) -> int:
        return len(self._cache)


# Singleton instance — 2048 entries covers ~10 images × ~13 categories + ~10 tags + covers
image_cache = ImageCache(max_size=2048)
