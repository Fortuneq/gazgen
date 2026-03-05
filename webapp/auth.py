import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs, unquote

import jwt
from fastapi import Request, HTTPException

from webapp.config import BOT_TOKEN
from webapp.db import get_pool

# JWT settings
JWT_SECRET = BOT_TOKEN  # reuse bot token as secret
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_SECONDS = 30 * 24 * 3600  # 30 days


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


def validate_telegram_login(data: dict, bot_token: str) -> dict:
    """Validate Telegram Login Widget callback data."""
    check_data = dict(data)
    received_hash = check_data.pop("hash", None)
    if not received_hash:
        raise ValueError("Missing hash")

    auth_date = check_data.get("auth_date")
    if auth_date:
        if time.time() - int(auth_date) > 86400:
            raise ValueError("Auth data expired")

    # Build check string: sorted key=value pairs joined by \n
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(check_data.items())
    )

    # For Login Widget: secret = SHA256(bot_token)
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    computed_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise ValueError("Invalid hash")

    return {
        "id": int(check_data["id"]),
        "first_name": check_data.get("first_name", ""),
        "last_name": check_data.get("last_name"),
        "username": check_data.get("username"),
        "photo_url": check_data.get("photo_url"),
    }


def create_jwt(user: dict) -> str:
    """Create a JWT token for the authenticated user."""
    payload = {
        "sub": user["id"],
        "first_name": user.get("first_name", ""),
        "username": user.get("username"),
        "exp": int(time.time()) + JWT_EXPIRE_SECONDS,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise ValueError("Token expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")
    return {
        "id": payload["sub"],
        "first_name": payload.get("first_name", ""),
        "username": payload.get("username"),
    }


async def _upsert_user(user: dict):
    """Insert or update user in the database."""
    pool = get_pool()
    telegram_id = int(user["id"])
    await pool.execute(
        """
        INSERT INTO users (telegram_id, username, first_name, last_name, is_bot, is_premium, last_active_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT ON CONSTRAINT users_telegram_id_key
        DO UPDATE SET
            username = COALESCE(EXCLUDED.username, users.username),
            first_name = COALESCE(EXCLUDED.first_name, users.first_name),
            last_name = COALESCE(EXCLUDED.last_name, users.last_name),
            last_active_at = NOW()
        """,
        telegram_id,
        user.get("username"),
        user.get("first_name"),
        user.get("last_name"),
        user.get("is_bot", False),
        user.get("is_premium", False),
    )


async def get_current_user(request: Request) -> dict:
    """FastAPI dependency: validate Telegram auth (MiniApp or JWT) and upsert user."""
    auth_header = request.headers.get("Authorization", "")

    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="BOT_TOKEN not configured")

    # Path 1: Telegram MiniApp initData
    if auth_header.startswith("tma "):
        init_data = auth_header[4:]
        try:
            user = validate_init_data(init_data, BOT_TOKEN)
        except ValueError as e:
            raise HTTPException(status_code=401, detail=str(e))

        if not user or not user.get("id"):
            raise HTTPException(status_code=401, detail="No user in initData")

        await _upsert_user(user)
        return user

    # Path 2: JWT Bearer token (from Telegram Login Widget)
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            user = decode_jwt(token)
        except ValueError as e:
            raise HTTPException(status_code=401, detail=str(e))

        if not user or not user.get("id"):
            raise HTTPException(status_code=401, detail="Invalid token payload")

        await _upsert_user(user)
        return user

    raise HTTPException(status_code=401, detail="Missing authorization")
