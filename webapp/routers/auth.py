from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from webapp.auth import validate_telegram_login, create_jwt, _upsert_user
from webapp.config import BOT_TOKEN

router = APIRouter()


class TelegramLoginData(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str


@router.post("/auth/telegram")
async def auth_telegram(data: TelegramLoginData):
    """Validate Telegram Login Widget data and return JWT."""
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="BOT_TOKEN not configured")

    try:
        user = validate_telegram_login(data.model_dump(), BOT_TOKEN)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    await _upsert_user(user)
    token = create_jwt(user)

    return {"token": token, "user": user}
