import base64
import logging

import aiohttp

from webapp.config import KIE_API_KEY, IMGBB_API_KEY

logger = logging.getLogger(__name__)

IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload"
IMGBB_EXPIRATION = 600

KIE_BASE_URL = "https://api.kie.ai/api/v1/jobs"
KIE_FILE_URL_UPLOAD = "https://kieai.redpandaai.co/api/file-url-upload"
KIE_FILE_BASE64_UPLOAD = "https://kieai.redpandaai.co/api/file-base64-upload"

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
    # Frontend model ids
    "nano": "nano-banana-pro",
    "flux": "flux-schnell",
    "nano-pro": "nano-banana-pro",
    "sd": "stable-diffusion-xl",
    "sora": "sora",
    "imagen": "imagen-4",
    "seedream": "seedream/4.5-text-to-image",
}

# Direct generation model keys → KIE model IDs + payload config
DIRECT_MODELS: dict[str, dict] = {
    "seedream": {
        "model_id": "seedream/4.5-text-to-image",
        "extra": {"quality": "basic"},
    },
    "seedream_v4": {
        "model_id": "bytedance/seedream-v4-text-to-image",
        "extra": {},
        "use_image_size": True,
    },
    "banana": {
        "model_id": "nano-banana-pro",
        "extra": {"resolution": "1K", "output_format": "png"},
    },
    "nano_banana": {
        "model_id": "google/nano-banana",
        "extra": {"resolution": "1K", "output_format": "png"},
    },
    "gpt_text": {
        "model_id": "gpt-image/1.5-text-to-image",
        "extra": {},
    },
    "gpt_img2img": {
        "model_id": "gpt-image/1.5-image-to-image",
        "extra": {},
    },
    "gpt4o": {
        "model_id": "gpt-image-1",
        "extra": {},
    },
    "qwen": {
        "model_id": "qwen/text-to-image",
        "extra": {},
        "use_image_size": True,
    },
    "grok": {
        "model_id": "grok-imagine/text-to-image",
        "extra": {},
    },
}

ASPECT_TO_SIZE = {
    "1:1": "1024x1024",
    "16:9": "1024x576",
    "9:16": "576x1024",
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


def _kie_file_url(data: dict) -> str | None:
    """Extract best URL from KIE upload response data."""
    d = data.get("data", {})
    return d.get("downloadUrl") or d.get("fileUrl")


async def upload_to_kie_base64(image_bytes: bytes, filename: str = "ref.png") -> str | None:
    """Upload image bytes to KIE via base64."""
    try:
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        headers = {
            "Authorization": f"Bearer {KIE_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "base64Data": image_base64,
            "uploadPath": "references",
            "fileName": filename,
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(KIE_FILE_BASE64_UPLOAD, json=payload, headers=headers) as resp:
                data = await resp.json()
                logger.info("KIE base64 upload response: success=%s, data_keys=%s",
                            data.get("success"), list(data.get("data", {}).keys()))
                if data.get("success"):
                    url = _kie_file_url(data)
                    logger.info("KIE base64 upload URL: %s", url)
                    return url
                logger.error("KIE base64 upload failed: %s", data)
                return None
    except Exception as e:
        logger.error("Error uploading to KIE (base64): %s", e)
        return None


async def upload_to_kie_url(file_url: str) -> str | None:
    """Re-upload an external URL to KIE storage."""
    try:
        headers = {
            "Authorization": f"Bearer {KIE_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "fileUrl": file_url,
            "uploadPath": "references",
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(KIE_FILE_URL_UPLOAD, json=payload, headers=headers) as resp:
                data = await resp.json()
                logger.info("KIE URL upload response: success=%s, data_keys=%s",
                            data.get("success"), list(data.get("data", {}).keys()))
                if data.get("success"):
                    url = _kie_file_url(data)
                    logger.info("KIE URL upload URL: %s", url)
                    return url
                logger.error("KIE URL upload failed: %s", data)
                return None
    except Exception as e:
        logger.error("Error uploading to KIE (url): %s", e)
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
    logger.info("createTask payload: %s", {**payload, "input": {**input_data, "prompt": input_data["prompt"][:80] + "..."}})

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{KIE_BASE_URL}/createTask", json=payload, headers=headers
        ) as resp:
            data = await resp.json()

    if data.get("code") != 200:
        raise RuntimeError(f"kie.ai createTask error: {data.get('msg')} (code {data.get('code')})")
    return data["data"]["taskId"]


async def create_generation_task_v2(
    model_key: str, prompt: str, reference_urls: list[str], aspect_ratio: str = "1:1"
) -> str:
    """Create a generation task using a direct model key (from DIRECT_MODELS)."""
    cfg = DIRECT_MODELS.get(model_key)
    if not cfg:
        raise RuntimeError(f"Unknown model key: {model_key}")

    model_id = cfg["model_id"]
    headers = {
        "Authorization": f"Bearer {KIE_API_KEY}",
        "Content-Type": "application/json",
    }

    input_data: dict = {"prompt": prompt, "aspect_ratio": aspect_ratio}
    if reference_urls:
        input_data["input_urls"] = reference_urls

    # Apply model-specific fields
    input_data.update(cfg.get("extra", {}))
    if cfg.get("use_image_size"):
        input_data["image_size"] = ASPECT_TO_SIZE.get(aspect_ratio, "1024x1024")

    payload = {"model": model_id, "input": input_data}
    logger.info("createTask_v2 payload: model=%s, input_urls=%s, aspect=%s",
                model_id, input_data.get("input_urls"), aspect_ratio)

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
