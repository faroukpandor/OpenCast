"""
FastAPI entry point for the Proprietary Streaming Intelligence Platform backend.
Asynchronous non-blocking architecture powered by aiosqlite, FastAPI, and httpx.
Zero third-party SaaS dependencies.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from api.analytics import router as analytics_router
from api.comments import router as comments_router
from api.issues import router as issues_router
from api.auth import router as auth_router
from api.devices import router as devices_router
from scrapers.reddit_scraper import run_reddit_scraper
from scrapers.youtube_rss import run_youtube_scraper
from scripts.generate_rag import generate_assets

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("streaming_intel.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting OpenCast backend engine...")
    await init_db()
    yield
    logger.info("Shutting down OpenCast backend engine.")

app = FastAPI(
    title="OpenCast API",
    description="OpenCast: Proprietary, privacy-first, self-hosted streaming hardware & troubleshooting platform.",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration for Cloudflare Pages and Astro SSG frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routers
app.include_router(analytics_router, prefix="/api")
app.include_router(comments_router, prefix="/api")
app.include_router(issues_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(devices_router, prefix="/api")

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "OpenCast Backend",
        "privacy": "Zero-PII GDPR Compliant",
        "saas_free": True
    }

@app.post("/api/scrapers/run")
async def trigger_scrapers(background_tasks: BackgroundTasks):
    """
    Triggers Reddit and YouTube RSS scrapers asynchronously in background tasks.
    """
    background_tasks.add_task(run_reddit_scraper)
    background_tasks.add_task(run_youtube_scraper)
    return {
        "status": "triggered",
        "message": "Scraper daemon started for Reddit and YouTube RSS in background."
    }

@app.post("/api/rag/generate")
async def trigger_rag_generation(background_tasks: BackgroundTasks):
    """
    Generates updated schema_org.json and llm-context.md assets.
    """
    background_tasks.add_task(generate_assets, ".")
    return {
        "status": "generating",
        "message": "RAG markdown and Schema.org JSON-LD regeneration started."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
