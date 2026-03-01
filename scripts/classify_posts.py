"""
One-time script to classify existing posts by tags using GPT-4o-mini.
Run: python scripts/classify_posts.py
"""
import asyncio
import json
import os
import sys

import asyncpg
from openai import AsyncOpenAI

# Add parent dir to path so we can import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from webapp.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, OPENAI_API_KEY

TAGS = [
    "male", "female", "couple", "group",
    "landscape", "object", "animal", "anime",
    "abstract", "fashion", "portrait", "fullbody",
]

SYSTEM_PROMPT = f"""You are a prompt classifier. Given an image generation prompt, classify it into one or more tags from this list:
{', '.join(TAGS)}

Rules:
- Return ONLY a JSON array of matching tags, e.g. ["male", "portrait"]
- A prompt can have multiple tags
- If the prompt describes a person, always include "male" or "female" (or both for "couple"/"group")
- If unclear gender, use the most likely one based on context
- "portrait" = face/upper body focus, "fullbody" = full body shown
- "landscape" = scenery without people as main subject
- "abstract" = non-representational art
- Return at least 1 tag"""

BATCH_SIZE = 5
client = AsyncOpenAI(api_key=OPENAI_API_KEY)


async def classify_single(prompt_text: str) -> list[str]:
    """Classify a single prompt using GPT-4o-mini."""
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Classify this prompt. Return ONLY a JSON array of tags, nothing else:\n\n{prompt_text[:500]}",
            },
        ],
        temperature=0.1,
        max_tokens=200,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content.strip()
    try:
        result = json.loads(content)
        # Handle {"tags": [...]} or direct [...]
        if isinstance(result, dict) and "tags" in result:
            tags = result["tags"]
        elif isinstance(result, list):
            tags = result
        else:
            # Try first list-valued key
            for v in result.values():
                if isinstance(v, list):
                    tags = v
                    break
            else:
                return ["abstract"]
        return [t for t in tags if t in TAGS] or ["abstract"]
    except (json.JSONDecodeError, KeyError):
        return ["abstract"]


async def classify_batch(prompts: list[dict]) -> list[list[str]]:
    """Classify a batch of prompts concurrently."""
    tasks = [classify_single(p["prompt"]) for p in prompts]
    return await asyncio.gather(*tasks)


async def main():
    pool = await asyncpg.create_pool(
        host=DB_HOST, port=DB_PORT, database=DB_NAME,
        user=DB_USER, password=DB_PASSWORD,
        min_size=1, max_size=3,
    )

    # Get posts without tags (or with empty tags)
    rows = await pool.fetch(
        """
        SELECT id, prompt FROM posts
        WHERE prompt IS NOT NULL AND prompt != ''
          AND (tags IS NULL OR array_length(tags, 1) IS NULL)
        ORDER BY id
        """
    )

    total = len(rows)
    print(f"Found {total} posts to classify")

    if total == 0:
        print("Nothing to do!")
        await pool.close()
        return

    classified = 0
    for i in range(0, total, BATCH_SIZE):
        batch = [{"id": r["id"], "prompt": r["prompt"]} for r in rows[i:i + BATCH_SIZE]]
        print(f"Processing batch {i // BATCH_SIZE + 1} ({len(batch)} posts)...")

        try:
            tags_list = await classify_batch(batch)
        except Exception as e:
            print(f"  Error classifying batch: {e}")
            continue

        for post, tags in zip(batch, tags_list):
            if tags:
                await pool.execute(
                    "UPDATE posts SET tags = $1 WHERE id = $2",
                    tags, post["id"],
                )
                classified += 1

        print(f"  Classified {min(i + BATCH_SIZE, total)}/{total}")

        # Small delay to avoid rate limiting
        await asyncio.sleep(0.5)

    print(f"\nDone! Classified {classified}/{total} posts")
    await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
