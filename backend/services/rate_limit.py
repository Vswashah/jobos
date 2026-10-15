"""
Small in-memory sliding-window rate limiter.

Good enough for a single-process deployment (the current Render setup): state
lives in this process, so it resets on restart and isn't shared between
workers. If the backend ever runs more than one process, move the counters to
a shared store (e.g. Redis) behind the same functions.

Set RATE_LIMIT_DISABLED=true to turn it off (the test suite does).
"""
import os
import threading
import time
from collections import deque

from fastapi import Depends, HTTPException, Request

from services.auth_service import get_current_user_id

_events: dict[str, deque] = {}
_lock = threading.Lock()
_MAX_KEYS = 50_000
_STALE_AFTER = 24 * 3600


def _disabled() -> bool:
    return os.getenv("RATE_LIMIT_DISABLED", "").lower() == "true"


def reset() -> None:
    with _lock:
        _events.clear()


def client_ip(request: Request) -> str:
    """Best-effort caller address. Behind a proxy the right-most
    X-Forwarded-For entry is the one added by the closest proxy, which is the
    hardest for a client to forge."""
    forwarded = request.headers.get("x-forwarded-for", "")
    parts = [p.strip() for p in forwarded.split(",") if p.strip()]
    if parts:
        return parts[-1]
    return request.client.host if request.client else "unknown"


def _too_many(retry_after: float):
    raise HTTPException(
        status_code=429,
        detail="Too many requests. Please try again later.",
        headers={"Retry-After": str(max(1, int(retry_after)))},
    )


def check(key: str, limit: int, window: int) -> None:
    """Raise 429 if `key` already has `limit` events inside `window` seconds.
    Does not record anything."""
    if _disabled():
        return
    now = time.monotonic()
    with _lock:
        q = _events.get(key)
        if not q:
            return
        while q and q[0] <= now - window:
            q.popleft()
        if len(q) < limit:
            return
        retry = window - (now - q[0])
    _too_many(retry)


def record(key: str) -> None:
    if _disabled():
        return
    now = time.monotonic()
    with _lock:
        if len(_events) > _MAX_KEYS:
            for k in [k for k, q in _events.items() if not q or q[-1] < now - _STALE_AFTER]:
                del _events[k]
        _events.setdefault(key, deque()).append(now)


def hit(key: str, limit: int, window: int) -> None:
    """Check then record: the usual 'N calls per window' rule."""
    check(key, limit, window)
    record(key)


def limit_ip(name: str, limit: int, window: int):
    """Route dependency limiting by caller address."""
    def dependency(request: Request):
        hit(f"{name}:ip:{client_ip(request)}", limit, window)
    return dependency


def limit_user(name: str, limit: int, window: int):
    """Route dependency limiting by signed-in user. Resolves auth first, so an
    unauthenticated call still gets a 401, not a 429."""
    def dependency(user_id: str = Depends(get_current_user_id)):
        hit(f"{name}:user:{user_id}", limit, window)
    return dependency
