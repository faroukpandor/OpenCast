"""
Production-ready async YouTube RSS feed parser.
Extracts streaming device tutorials, firmware updates, and workaround videos
from public YouTube XML feeds and maps them into the issues and solutions tables.
"""

import sys
import os
import asyncio
import logging
import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Any

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from database import get_db_connection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("streaming_intel.youtube_rss")

YOUTUBE_CHANNELS = [
    {
        "channel_id": "UCvXN2Bf36-5lGZ8eQ8Q8q3w",
        "name": "Independent Streaming Lab & Tech Workarounds",
        "default_device_id": 1
    },
    {
        "channel_id": "UC0tO3hR1054bB1wKzX68iUA",
        "name": "FireTV / Android TV Hacks",
        "default_device_id": 2
    }
]

STREAMING_KEYWORDS = [
    "fire tv", "firestick", "chromecast", "google tv", "roku",
    "downloader", "sideload", "adb", "apk", "elephant", "kodi",
    "launcher", "update", "audio passthrough", "debloat", "fix"
]

async def fetch_and_parse_channel_feed(client: httpx.AsyncClient, channel_id: str, default_device_id: int):
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    logger.info(f"Fetching YouTube RSS feed: {url}")
    try:
        response = await client.get(url, timeout=15.0)
        if response.status_code != 200:
            logger.warning(f"YouTube RSS returned status {response.status_code} for {channel_id}")
            return

        soup = BeautifulSoup(response.content, "xml")
        entries = soup.find_all("entry")
        logger.info(f"Found {len(entries)} video entries in channel {channel_id}")

        db = await get_db_connection()
        try:
            for entry in entries:
                title_elem = entry.find("title")
                title = title_elem.text.strip() if title_elem else "Untitled Video"

                desc_elem = entry.find("media:description")
                desc = desc_elem.text.strip() if desc_elem else ""

                video_id_elem = entry.find("yt:videoId")
                video_id = video_id_elem.text.strip() if video_id_elem else ""

                combined = f"{title} {desc}".lower()

                # Check if matches any streaming topic
                if not any(kw in combined for kw in STREAMING_KEYWORDS):
                    continue

                # Determine device
                device_id = default_device_id
                if "roku" in combined:
                    device_id = 4
                elif "chromecast" in combined or "google tv" in combined:
                    device_id = 2
                elif "fire" in combined or "firestick" in combined:
                    device_id = 1

                # Check existing
                cursor = await db.execute("SELECT id FROM issues WHERE title = ?;", (title,))
                existing = await cursor.fetchone()
                if existing:
                    continue

                severity = "medium"
                if "bootloop" in combined or "brick" in combined:
                    severity = "critical"
                elif "fix" in combined or "bypass" in combined:
                    severity = "high"

                clean_desc = desc[:600] + "..." if len(desc) > 600 else desc
                if not clean_desc:
                    clean_desc = f"Video analysis and guide: https://youtube.com/watch?v={video_id}"

                cursor = await db.execute(
                    "INSERT INTO issues (device_id, title, description, severity) VALUES (?, ?, ?, ?);",
                    (device_id, title, clean_desc, severity)
                )
                issue_id = cursor.lastrowid
                logger.info(f"Ingested YouTube issue #{issue_id}: '{title}'")

                # Insert video tutorial solution
                video_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else url
                await db.execute(
                    """
                    INSERT INTO solutions (issue_id, method, command_code, success_rate)
                    VALUES (?, 'Software', ?, 0.90);
                    """,
                    (issue_id, f"Video walkthrough: {video_url}")
                )

            # Record in sources
            await db.execute(
                """
                INSERT INTO sources (url, platform, last_scraped)
                VALUES (?, 'YouTube', CURRENT_TIMESTAMP)
                ON CONFLICT(url) DO UPDATE SET last_scraped = CURRENT_TIMESTAMP;
                """,
                (url,)
            )
            await db.commit()
        finally:
            await db.close()

    except Exception as e:
        logger.error(f"Error parsing YouTube RSS feed {channel_id}: {e}")

async def run_youtube_scraper():
    logger.info("Starting YouTube RSS Ingestion...")
    async with httpx.AsyncClient(headers={"User-Agent": "StreamingIntelRSS/1.0"}) as client:
        for channel in YOUTUBE_CHANNELS:
            await fetch_and_parse_channel_feed(client, channel["channel_id"], channel["default_device_id"])
            await asyncio.sleep(1.0)
    logger.info("YouTube RSS Ingestion completed.")

if __name__ == "__main__":
    asyncio.run(run_youtube_scraper())
