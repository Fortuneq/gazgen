# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GasGen (Photix) is an AI image generation platform with three main components:
- **Telegram Bot** (`bot/`) — aiogram 3 bot for browsing/generating images via Telegram
- **Web API** (`webapp/`) — FastAPI backend serving the MiniApp
- **MiniApp** (`miniapp/`) — React + TypeScript frontend (Telegram WebApp)

All content originates from parsed Higgsfield community posts stored in PostgreSQL with pgvector for semantic search.

## Architecture

### Data Flow
Posts with prompts and images are stored in PostgreSQL (pgvector/pg16). Prompt embeddings use `all-MiniLM-L6-v2` (384-dim vectors). Images are stored as BYTEA in the `images` table. Generation requests go through KIE API (`api.kie.ai`), with temporary image hosting via ImgBB.

### Bot (`bot/`)
- Entry: `bot/main.py` — aiogram Dispatcher with MemoryStorage
- Handlers in `bot/handlers/`: start, categories, search, image_gen, generate_like
- DB access: `bot/database.py` → `bot/db_postgres.py` (psycopg2, synchronous)
- Loads sentence-transformers model at startup for search

### Web API (`webapp/`)
- Entry: `webapp/main.py` — FastAPI app with lifespan (asyncpg pool)
- Routers in `webapp/routers/`: categories, posts, images, search, generate, tags, profile
- Services in `webapp/services/`: generation (KIE API), embedding, ai_agent
- DB: asyncpg connection pool (`webapp/db.py`)
- Auth: Telegram WebApp `initData` HMAC validation (`webapp/auth.py`), header prefix `tma `
- All API routes prefixed with `/api`
- Static files (built React app) served from `/static/` at root mount

### MiniApp (`miniapp/`)
- React 18 + TypeScript + Vite, no CSS framework (custom CSS in `src/styles/`)
- Uses `MemoryRouter` (required for Telegram WebApp — no browser URL bar)
- `src/telegram.ts` — Telegram WebApp SDK wrapper (init, auth, haptics)
- `src/api.ts` — API client, sends auth as `Authorization: tma <initData>`
- Pages are lazy-loaded; icons from `lucide-react`
- All routes defined in `src/App.tsx`

### Database
- PostgreSQL 16 with pgvector extension
- Schema: `db_schema.sql` (posts, images, categories + vector search function)
- Analytics: `db_analytics_schema.sql` (users, sessions, actions)
- Migrations: `migrations/` (e.g., `002_add_credits.sql` — credits system, model pricing)
- Trigger auto-updates `categories.post_count` on post changes

### Generation Models
Model mapping lives in `webapp/services/generation.py`. Two paths:
- `create_generation_task()` — category-based (from existing posts)
- `create_generation_task_v2()` — direct model key (DIRECT_MODELS dict)

Model pricing tiers (in credits): Standard=9, Pro=19, Ultra=35.

## Development Commands

### MiniApp (frontend)
```bash
cd miniapp
npm install
npm run dev          # Vite dev server (proxies /api to localhost:8000)
npm run build        # tsc && vite build → miniapp/dist/
```

### Web API (backend)
```bash
pip install -r webapp/requirements.txt
uvicorn webapp.main:app --reload --port 8000
```

### Telegram Bot
```bash
pip install -r requirements.txt    # or requirements_bot.txt
python bot/main.py
```

### Docker
```bash
# Full stack (postgres + bot + pgadmin optional)
docker compose up -d
docker compose --profile admin up -d    # with pgAdmin

# MiniApp + nginx (production)
docker compose -f docker-compose-miniapp.yml up -d --build

# Bot only (connects to existing postgres)
docker compose -f docker-compose-bot-only.yml up -d --build
```

### Database
```bash
# Apply base schema
psql -U postgres -d gasgen -f db_schema.sql
psql -U postgres -d gasgen -f db_analytics_schema.sql

# Run migrations
psql -U postgres -d gasgen -f migrations/002_add_credits.sql
```

## Production Server

Production instance runs on a remote server accessible via `ssh gas`. Claude can use this command to connect. The project directory on the server is `~/gazgen`. Typical deployment workflow:
```bash
ssh gas "cd gazgen && git pull && docker compose -f docker-compose-miniapp.yml up -d --build"
```

## Key Environment Variables

See `.env.example`: `BOT_TOKEN`, `OPENAI_API_KEY`, `KIE_API_KEY`, `IMGBB_API_KEY`, `DB_HOST/PORT/NAME/USER/PASSWORD`, `MINIAPP_URL`.

## Conventions

- Project language is mixed Russian/English — comments and user-facing strings are often in Russian
- Bot uses synchronous psycopg2; webapp uses async asyncpg — do not mix
- The webapp Dockerfile is a multi-stage build: Node (frontend) → Python (backend), output in `/static/`
- Embedding model is `all-MiniLM-L6-v2` — do not change without re-embedding all posts (384-dim vectors)
