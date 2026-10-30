# GasGen (Photix)

An AI image and video generation platform delivered through Telegram: a bot, a Telegram Mini App and a web API. Users browse a library of ready-made prompts parsed from the Higgsfield community, find similar ones with semantic search, and generate their own images and videos.

## Features

- **Prompt library** — posts with prompts, results and reference images parsed from the Higgsfield community
- **Semantic search** — prompt embeddings (`all-MiniLM-L6-v2`, 384-dim) stored in PostgreSQL with pgvector
- **Generation flows in the bot** — photo generation, custom prompts, "generate like this", video, photo animation and face swap (generation via the Kie.ai API)
- **Mini App** — React + TypeScript Telegram WebApp for browsing categories and generating
- **Purchases and profile** — paid generations and a user profile in the bot
- **Admin and analytics** — admin endpoints and a separate analytics schema

## Architecture

```
bot/          — aiogram 3 Telegram bot (handlers for each generation flow)
webapp/       — FastAPI backend for the Mini App: auth, categories, images, generation, admin
miniapp/      — React + TypeScript Telegram Mini App
higgsfield_parser_v3.py, indexer.py  — Playwright parser and embedding indexer
migrations/, db_schema.sql           — PostgreSQL schema
nginx/, docker-compose*.yml          — deployment
```

## Tech stack

Python, aiogram 3, FastAPI, PostgreSQL + pgvector, sentence-transformers, Playwright, OpenAI API, Kie.ai API, React, TypeScript, Docker, nginx, Prometheus, Grafana.

## Getting started

```bash
cp .env.example .env              # BOT_TOKEN, OPENAI_API_KEY, KIE_API_KEY, DB_* settings
docker compose up -d              # PostgreSQL, bot, pgAdmin, Prometheus, Grafana
```

Bot only, or the Mini App with its web API:

```bash
docker compose -f docker-compose-bot-only.yml up -d
docker compose -f docker-compose-miniapp.yml up -d
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) and [`DOCKER_DEPLOYMENT.md`](DOCKER_DEPLOYMENT.md) for production setup with SSL.
