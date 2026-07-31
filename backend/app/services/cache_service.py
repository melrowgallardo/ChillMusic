import time
import threading
from typing import Any, Optional, Dict, Tuple

class TTLCache:
    def __init__(self, default_ttl: int = 300, max_size: int = 500):
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._default_ttl = default_ttl
        self._max_size = max_size
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                return None
            expire_time, value = self._cache[key]
            if time.time() > expire_time:
                del self._cache[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        with self._lock:
            if len(self._cache) >= self._max_size:
                # Evict expired items or oldest item
                now = time.time()
                expired_keys = [k for k, (exp, _) in self._cache.items() if now > exp]
                if expired_keys:
                    for k in expired_keys:
                        del self._cache[k]
                else:
                    # Remove first inserted item
                    oldest_key = next(iter(self._cache))
                    del self._cache[oldest_key]

            expire_time = time.time() + (ttl if ttl is not None else self._default_ttl)
            self._cache[key] = (expire_time, value)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

search_cache = TTLCache(default_ttl=300, max_size=500)
