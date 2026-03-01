from fastapi import APIRouter, Depends

from webapp.auth import get_current_user
from webapp.db import get_pool
from webapp.models import ProfileOut

router = APIRouter()


@router.get("/profile", response_model=ProfileOut)
async def get_profile(user: dict = Depends(get_current_user)):
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT telegram_id, first_name, username, photo_credits, video_credits "
        "FROM users WHERE telegram_id = $1",
        user["id"],
    )
    return ProfileOut(
        telegram_id=row["telegram_id"],
        first_name=row["first_name"],
        username=row["username"],
        photo_credits=row["photo_credits"],
        video_credits=row["video_credits"],
    )
