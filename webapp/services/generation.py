import base64
import logging

import aiohttp

from webapp.config import KIE_API_KEY, IMGBB_API_KEY

logger = logging.getLogger(__name__)

IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload"
IMGBB_EXPIRATION = 600

KIE_BASE_URL = "https://api.kie.ai/api/v1/jobs"

CATEGORY_TO_MODEL = {
    "nano_banana_pro": "nano-banana-pro",
    "nano_banana_2": "nano-banana-pro",
    "nano_banana": "google/nano-banana",
    "nano_strawberry": "seedream/4.5-text-to-image",
    "nano_peach": "seedream/4.5-text-to-image",
    "nano_mango": "seedream/4.5-text-to-image",
    "nano_kiwi": "seedream/4.5-text-to-image",
    "nano_cherry": "seedream/4.5-text-to-image",
    "nano_lemon": "seedream/4.5-text-to-image",
    "nano_grape": "seedream/4.5-text-to-image",
    "nano_melon": "seedream/4.5-text-to-image",
    "nano_orange": "seedream/4.5-text-to-image",
    "nano_pineapple": "seedream/4.5-text-to-image",
}


def get_model_id(category: str) -> str:
    key = category.lower().replace(" ", "_")
    return CATEGORY_TO_MODEL.get(key, "nano-banana-pro")


async def upload_image_to_imgbb(image_bytes: bytes) -> str | None:
    try:
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        async with aiohttp.ClientSession() as session:
            form_data = aiohttp.FormData()
            form_data.add_field("image", image_base64)
            params = {"key": IMGBB_API_KEY, "expiration": IMGBB_EXPIRATION}
            async with session.post(IMGBB_UPLOAD_URL, data=form_data, params=params) as resp:
                data = await resp.json()
                if data.get("success"):
                    return data["data"]["url"]
                logger.error("ImgBB upload failed: %s", data)
                return None
    except Exception as e:
        logger.error("Error uploading to ImgBB: %s", e)
        return None


async def create_generation_task(
    model_id: str, prompt: str, reference_urls: list[str], aspect_ratio: str = "1:1"
) -> str:
    headers = {
        "Authorization": f"Bearer {KIE_API_KEY}",
        "Content-Type": "application/json",
    }
    input_data: dict = {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
    }
    if reference_urls:
        input_data["input_urls"] = reference_urls

    if "nano-banana" in model_id.lower():
        input_data["resolution"] = "1K"
        input_data["output_format"] = "png"
    elif "seedream" in model_id.lower():
        input_data["quality"] = "basic"

    payload = {"model": model_id, "input": input_data}

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{KIE_BASE_URL}/createTask", json=payload, headers=headers
        ) as resp:
            data = await resp.json()

    if data.get("code") != 200:
        raise RuntimeError(f"kie.ai createTask error: {data.get('msg')} (code {data.get('code')})")
    return data["data"]["taskId"]


async def poll_task_status(task_id: str) -> dict:
    headers = {"Authorization": f"Bearer {KIE_API_KEY}"}
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{KIE_BASE_URL}/recordInfo",
            params={"taskId": task_id},
            headers=headers,
        ) as resp:
            data = await resp.json()

    if data.get("code") != 200:
        raise RuntimeError(f"kie.ai recordInfo error: {data.get('msg')}")

    import json as json_mod

    state = data["data"].get("state")
    if state == "success":
        result = json_mod.loads(data["data"]["resultJson"])
        return {"status": "success", "result_url": result["resultUrls"][0]}
    elif state == "fail":
        return {"status": "failed", "error": data["data"].get("failMsg", "Unknown error")}
    else:
        return {"status": "processing"}
