from openai import AsyncOpenAI
from webapp.config import OPENAI_API_KEY

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = """You are an expert AI image generation prompt engineer specializing in Higgsfield AI.

Your job is to take:
1. An original successful prompt from the Higgsfield community
2. The user's creative idea or description

And produce a new, optimized prompt that:
- Adapts the structure and style of the original prompt
- Incorporates the user's idea naturally
- Maintains technical quality (lighting, camera settings, texture details, composition)
- Is written in English
- Is ready to use directly in Higgsfield AI

Keep the prompt focused and between 200-600 characters unless more detail is truly needed.
Do NOT include any explanation or preamble - output ONLY the prompt text."""


async def generate_adapted_prompt(
    user_idea: str,
    original_prompt: str,
    similar_post_category: str = "",
) -> str:
    response = await client.chat.completions.create(
        model="gpt-4o",
        max_tokens=1024,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Original prompt from Higgsfield community (category: {similar_post_category}):\n"
                    f"---\n{original_prompt[:800]}\n---\n\n"
                    f"User's creative idea:\n{user_idea}\n\n"
                    f"Generate an adapted prompt that incorporates the user's idea "
                    f"while maintaining the technical quality of the original."
                ),
            },
        ],
    )
    return response.choices[0].message.content.strip()


async def categorize_user_request(user_text: str) -> str:
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=200,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Translate this image idea to English for AI image search "
                    f"(output ONLY the English translation, nothing else): {user_text}"
                ),
            }
        ],
    )
    return response.choices[0].message.content.strip()
