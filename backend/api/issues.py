"""
Issues API module.
Provides full issue catalog, detailed ADB / Settings solutions,
and an intelligent Related Issues endpoint utilizing keyword similarity and SQLite FTS.
"""

import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from database import get_db_connection

router = APIRouter(prefix="/issues", tags=["issues"])

STOP_WORDS = {
    "the", "and", "for", "with", "from", "that", "this", "have", "been", "which",
    "what", "when", "where", "there", "some", "them", "they", "their", "about",
    "into", "after", "will", "also", "than", "then", "very", "just", "more",
    "only", "over", "such", "how", "any", "can", "not", "are", "was", "were",
    "has", "had", "does", "did", "out", "off", "down", "all"
}

def extract_keywords(text: str) -> List[str]:
    """Extracts clean alphanumeric keywords with length >= 3, excluding stopwords."""
    words = re.findall(r"[a-zA-Z0-9_-]{3,}", text.lower())
    return [w for w in set(words) if w not in STOP_WORDS]

@router.get("")
async def list_issues(
    device_id: Optional[int] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None
):
    """
    Lists streaming device issues with optional filtering.
    """
    db = await get_db_connection()
    try:
        query = """
            SELECT i.id, i.device_id, i.title, i.description, i.severity, i.created_at,
                   d.name as device_name, d.ecosystem
            FROM issues i
            LEFT JOIN devices d ON i.device_id = d.id
            WHERE 1=1
        """
        params = []
        if device_id:
            query += " AND i.device_id = ?"
            params.append(device_id)
        if severity:
            query += " AND i.severity = ?"
            params.append(severity)
        if search:
            query += " AND (i.title LIKE ? OR i.description LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])

        query += " ORDER BY i.id DESC;"
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()

        issues = []
        for r in rows:
            # Fetch solutions count
            s_cursor = await db.execute("SELECT COUNT(*) FROM solutions WHERE issue_id = ?;", (r["id"],))
            sol_count = (await s_cursor.fetchone())[0]

            issues.append({
                "id": r["id"],
                "device_id": r["device_id"],
                "device_name": r["device_name"],
                "ecosystem": r["ecosystem"],
                "title": r["title"],
                "description": r["description"],
                "severity": r["severity"],
                "solutions_count": sol_count,
                "created_at": r["created_at"]
            })
        return issues
    finally:
        await db.close()

@router.get("/{issue_id}")
async def get_issue(issue_id: int):
    """
    Fetches a single issue with all associated verified solutions and device specs.
    """
    db = await get_db_connection()
    try:
        cursor = await db.execute(
            """
            SELECT i.id, i.device_id, i.title, i.description, i.severity, i.created_at,
                   d.name as device_name, d.ecosystem, d.specs_json
            FROM issues i
            LEFT JOIN devices d ON i.device_id = d.id
            WHERE i.id = ?;
            """,
            (issue_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Issue #{issue_id} not found")

        # Fetch solutions
        sol_cursor = await db.execute(
            """
            SELECT id, method, command_code, success_rate
            FROM solutions
            WHERE issue_id = ?
            ORDER BY success_rate DESC;
            """,
            (issue_id,)
        )
        solutions = [dict(s) for s in await sol_cursor.fetchall()]

        return {
            "id": row["id"],
            "device_id": row["device_id"],
            "device_name": row["device_name"],
            "ecosystem": row["ecosystem"],
            "title": row["title"],
            "description": row["description"],
            "severity": row["severity"],
            "created_at": row["created_at"],
            "solutions": solutions
        }
    finally:
        await db.close()

@router.get("/{issue_id}/related")
async def get_related_issues(issue_id: int):
    """
    Queries the database for issues with similar keywords in their title or description.
    Uses SQLite full-text search (FTS5) or weighted keyword relevance matching.
    Returns a list of up to 5 related issue IDs and titles with match metadata.
    """
    db = await get_db_connection()
    try:
        # 1. Fetch target issue
        cursor = await db.execute(
            "SELECT id, device_id, title, description, severity FROM issues WHERE id = ?;",
            (issue_id,)
        )
        target = await cursor.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail=f"Target issue #{issue_id} not found")

        target_keywords = extract_keywords(f"{target['title']} {target['description']}")
        if not target_keywords:
            return []

        # 2. Try FTS5 search first if table exists
        candidates = []
        fts_success = False
        try:
            # Construct FTS query using OR between top keywords
            fts_query_str = " OR ".join(target_keywords[:8])
            fts_cursor = await db.execute(
                """
                SELECT rowid as id, title, description, rank
                FROM issues_fts
                WHERE issues_fts MATCH ? AND rowid != ?
                ORDER BY rank
                LIMIT 10;
                """,
                (fts_query_str, issue_id)
            )
            fts_rows = await fts_cursor.fetchall()
            if fts_rows:
                for r in fts_rows:
                    candidates.append({
                        "id": r["id"],
                        "title": r["title"],
                        "description": r["description"]
                    })
                fts_success = True
        except Exception:
            fts_success = False

        # 3. Fallback or augment with keyword frequency matching across all other issues
        if not fts_success or len(candidates) < 5:
            all_cursor = await db.execute(
                """
                SELECT i.id, i.device_id, i.title, i.description, i.severity, d.name as device_name
                FROM issues i
                LEFT JOIN devices d ON i.device_id = d.id
                WHERE i.id != ?;
                """,
                (issue_id,)
            )
            all_rows = await all_cursor.fetchall()

            scored_issues = []
            for row in all_rows:
                c_title_words = set(extract_keywords(row["title"]))
                c_desc_words = set(extract_keywords(row["description"]))

                score = 0
                matched_words = []
                for kw in target_keywords:
                    if kw in c_title_words:
                        score += 3
                        matched_words.append(kw)
                    elif kw in c_desc_words:
                        score += 1
                        matched_words.append(kw)

                # Device match bonus
                if row["device_id"] == target["device_id"]:
                    score += 1.5

                if score > 0:
                    scored_issues.append({
                        "id": row["id"],
                        "title": row["title"],
                        "score": score,
                        "severity": row["severity"],
                        "matched_keywords": matched_words
                    })

            # Sort descending by score
            scored_issues.sort(key=lambda x: x["score"], reverse=True)
            return scored_issues[:5]

        # If FTS succeeded, return formatted candidates
        result = []
        for c in candidates[:5]:
            matched = [kw for kw in target_keywords if kw in c["title"].lower() or kw in c["description"].lower()]
            result.append({
                "id": c["id"],
                "title": c["title"],
                "matched_keywords": matched
            })
        return result
    finally:
        await db.close()
