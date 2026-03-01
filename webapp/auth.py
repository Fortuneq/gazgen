import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs, unquote

from fastapi import Request, HTTPException

from webapp.config import BOT_TOKEN
from webapp.db import get_pool


def validate_init_data(init_data: str, bot_token: str) -> dict:
    """Validate Telegram WebApp initData using HMAC-SHA256."""
    parsed = parse_qs(init_data, keep_blank_values=True)
    # Each value is a list, take first element
    params = {k: v[0] for k, v in parsed.items()}

    received_hash = params.pop("hash", None)
    if not received_hash:
        raise ValueError("Missing hash in initData")

    # Check auth_date is not too old (allow 24h)
    auth_date = params.get("auth_date")
    if auth_date:
        if time.time() - int(auth_date) > 86400:
            raise ValueError("initData is expired")

    # Build data-check-string: sorted key=value pairs joined by \n
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(params.items())
    )

    # Compute HMAC
    secret_key = hmac.new(
        b"WebAppData", bot_token.encode(), hashlib.sha256
    ).digest()
    computed_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise ValueError("Invalid hash")

    # Parse user JSON
    user_data = params.get("user")
    if user_data:
        return json.loads(unquote(user_data))
    return {}


async def get_current_user(request: Request) -> dict:
    """FastAPI dependency: validate Telegram auth and upsert user."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("tma "):
        raise HTTPException(status_code=401, detail="Missing authorization")

    init_data = auth_header[4:]  # strip "tma " prefix
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="BOT_TOKEN not configured")

    try:
        user = validate_init_data(init_data, BOT_TOKEN)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    if not user or not user.get("id"):
        raise HTTPException(status_code=401, detail="No user in initData")

    # Upsert user into users table
    pool = get_pool()
    await pool.execute(
        """
        INSERT INTO users (telegram_id, username, first_name, last_name, is_bot, is_premium, last_active_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (telegram_id)
        DO UPDATE SET
            username = COALESCE(EXCLUDED.username, users.username),
            first_name = COALESCE(EXCLUDED.first_name, users.first_name),
            last_name = COALESCE(EXCLUDED.last_name, users.last_name),
            last_active_at = NOW()
        """,
        user["id"],
        user.get("username"),
        user.get("first_name"),
        user.get("last_name"),
        user.get("is_bot", False),
        user.get("is_premium", False),
    )

    return user
