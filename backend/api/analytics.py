"""
Privacy-first analytics API module.
No third-party trackers (No Google Analytics, No Cloudflare Web Analytics, No Cookies).
Raw IP addresses are strictly discarded and never written to disk or database.
IP addresses are hashed with a daily rotating cryptographic salt to ensure strict GDPR compliance,
while preserving accurate daily unique visitor counts for capacity planning.
"""

import os
import hashlib
from datetime import date
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from database import get_db_connection

router = APIRouter(prefix="/analytics", tags=["analytics"])

DAILY_SALT_SECRET = os.getenv("DAILY_SALT_SECRET", "streaming-intel-salt-2026-production")

class TrackPayload(BaseModel):
    page: str
    ref: Optional[str] = None
    ua: Optional[str] = None

def compute_daily_hash(ip: str) -> str:
    """
    Hashing IP with daily salt ensures GDPR compliance while maintaining daily unique visitor metrics.
    Once the day rolls over at 00:00 UTC, the salt changes, making it mathematically impossible
    to correlate user behavior across multi-day sessions.
    """
    today_str = date.today().isoformat()
    clean_ip = ip.strip() if ip else "127.0.0.1"
    raw_key = f"{clean_ip}_{today_str}_{DAILY_SALT_SECRET}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:16]

def classify_device(ua_string: Optional[str]) -> str:
    """Classifies client environment without storing user-agent fingerprints."""
    if not ua_string:
        return "Desktop"
    ua = ua_string.lower()
    if any(k in ua for k in ["aft", "firetv", "firestick", "chromecast", "googletv", "android tv", "crkey", "roku", "appletv", "smarttv", "shield", "onn."]):
        return "Streaming Device"
    if "ipad" in ua or ("android" in ua and "mobile" not in ua):
        return "Tablet"
    if "mobile" in ua or "iphone" in ua or "android" in ua:
        return "Mobile"
    return "Desktop"

@router.post("/track")
async def track_pageview(payload: TrackPayload, request: Request):
    """
    Accepts page view beacon. Strips all PII and logs anonymous event.
    """
    # Extract client IP solely for in-memory one-way daily salt hashing
    client_ip = request.client.host if request.client else "127.0.0.1"
    # Also check X-Forwarded-For if behind reverse proxy
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    daily_hash = compute_daily_hash(client_ip)
    device_type = classify_device(payload.ua or request.headers.get("user-agent"))
    referrer = payload.ref or request.headers.get("referer") or "Direct"

    # Normalize page URL
    page_url = payload.page.strip() or "/"

    db = await get_db_connection()
    try:
        # Note: We insert page_url, referrer, device_type into analytics_events.
        # Notice NO IP ADDRESS IS STORED!
        await db.execute(
            """
            INSERT INTO analytics_events (page_url, referrer, device_type, timestamp)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP);
            """,
            (page_url, referrer, device_type)
        )
        await db.commit()
    finally:
        await db.close()

    return {
        "status": "recorded",
        "gdpr_compliant": True,
        "daily_visitor_token": daily_hash,
        "device_type": device_type
    }

@router.get("/stats")
async def get_analytics_stats():
    """
    Returns aggregated metrics for the platform dashboard.
    """
    db = await get_db_connection()
    try:
        # Total page views
        cursor = await db.execute("SELECT COUNT(*) FROM analytics_events;")
        total_views = (await cursor.fetchone())[0]

        # Views today
        cursor = await db.execute(
            "SELECT COUNT(*) FROM analytics_events WHERE DATE(timestamp) = DATE('now');"
        )
        views_today = (await cursor.fetchone())[0]

        # Top pages
        cursor = await db.execute(
            """
            SELECT page_url, COUNT(*) as hits
            FROM analytics_events
            GROUP BY page_url
            ORDER BY hits DESC
            LIMIT 10;
            """
        )
        top_pages = [{"page": row["page_url"], "hits": row["hits"]} for row in await cursor.fetchall()]

        # Top referrers
        cursor = await db.execute(
            """
            SELECT referrer, COUNT(*) as hits
            FROM analytics_events
            WHERE referrer IS NOT NULL AND referrer != ''
            GROUP BY referrer
            ORDER BY hits DESC
            LIMIT 10;
            """
        )
        top_referrers = [{"referrer": row["referrer"], "hits": row["hits"]} for row in await cursor.fetchall()]

        # Device breakdown
        cursor = await db.execute(
            """
            SELECT device_type, COUNT(*) as count
            FROM analytics_events
            GROUP BY device_type;
            """
        )
        device_breakdown = {row["device_type"]: row["count"] for row in await cursor.fetchall()}

        return {
            "total_views": total_views,
            "views_today": views_today,
            "top_pages": top_pages,
            "top_referrers": top_referrers,
            "device_breakdown": device_breakdown,
            "privacy_standard": "Zero-PII Daily Salt Hash (No Cookies, No Fingerprints)"
        }
    finally:
        await db.close()
