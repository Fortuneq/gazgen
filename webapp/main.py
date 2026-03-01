import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from webapp.db import init_pool, close_pool
from webapp.routers import categories, posts, images, search, generate, tags


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="GasGen MiniApp API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

app.include_router(categories.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(images.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(tags.router, prefix="/api")

# Serve frontend static files (built React app) — MUST be last, catches all unmatched routes
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
