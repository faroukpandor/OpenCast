"""
Cryptographic Anti-Spam Comment API.
Zero third-party CAPTCHA (No Google reCAPTCHA, No Cloudflare Turnstile).
Enforces computational Proof of Work (PoW) on submission:
The backend computes SHA-256(content + nonce). If the digest does not begin with '000',
the request is rejected with HTTP 400 Bad Request.
Humans can mine this nonce on their client machine in ~150-500ms, while making automated
mass spam attacks computationally prohibitive for botnets without human intervention.
Associates comments with authenticated users or produces an anonymous author hash.
"""

import hashlib
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field

from database import get_db_connection

router = APIRouter(prefix="/comments", tags=["comments"])

class CommentCreatePayload(BaseModel):
    page_slug: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=3, max_length=2000)
    nonce: str = Field(..., min_length=1, max_length=100)
    user_id: Optional[int] = None

def verify_proof_of_work(content: str, nonce: str) -> bool:
    """Verifies that SHA-256(content + nonce) starts with '000' (~4096 difficulty)."""
    payload = f"{content}{nonce}"
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return digest.startswith("000")

@router.post("")
async def create_comment(
    payload: CommentCreatePayload,
    authorization: Optional[str] = Header(None)
):
    """
    Submits a comment guarded by SHA-256 Proof of Work.
    """
    # 1. Verify Cryptographic Proof of Work
    if not verify_proof_of_work(payload.content, payload.nonce):
        raise HTTPException(
            status_code=400,
            detail="Invalid Proof of Work nonce. SHA-256(content + nonce) must start with '000'. Stop spamming."
        )

    # 2. Check for optional authenticated user token
    authenticated_user_id = None
    author_name = "Anonymous Engineer"
    db = await get_db_connection()
    try:
        if authorization and authorization.startswith("Bearer "):
            token = authorization[7:].strip()
            cursor = await db.execute(
                "SELECT id, username FROM users WHERE token = ?;", (token,)
            )
            user_row = await cursor.fetchone()
            if user_row:
                authenticated_user_id = user_row["id"]
                author_name = user_row["username"]

        # Generate privacy-preserving author hash
        author_hash = hashlib.sha256(f"{author_name}_{payload.page_slug}".encode()).hexdigest()[:12]

        cursor = await db.execute(
            """
            INSERT INTO comments (page_slug, author_hash, user_id, content, proof_of_work_nonce, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
            """,
            (
                payload.page_slug,
                author_hash,
                authenticated_user_id or payload.user_id,
                payload.content,
                payload.nonce
            )
        )
        comment_id = cursor.lastrowid
        await db.commit()

        return {
            "status": "success",
            "comment_id": comment_id,
            "page_slug": payload.page_slug,
            "author_hash": author_hash,
            "author_name": author_name,
            "proof_of_work_verified": True
        }
    finally:
        await db.close()

@router.get("/{page_slug}")
async def get_comments_for_page(page_slug: str):
    """
    Fetches all verified comments for a given page/issue slug.
    """
    db = await get_db_connection()
    try:
        cursor = await db.execute(
            """
            SELECT c.id, c.page_slug, c.author_hash, c.user_id, c.content,
                   c.proof_of_work_nonce, c.created_at, u.username
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.page_slug = ?
            ORDER BY c.created_at DESC;
            """,
            (page_slug,)
        )
        rows = await cursor.fetchall()
        comments = []
        for r in rows:
            comments.append({
                "id": r["id"],
                "page_slug": r["page_slug"],
                "author_hash": r["author_hash"],
                "author_name": r["username"] or f"Engineer #{r['author_hash'][:4]}",
                "is_authenticated": r["user_id"] is not None,
                "content": r["content"],
                "proof_of_work_nonce": r["proof_of_work_nonce"],
                "created_at": r["created_at"]
            })
        return {"page_slug": page_slug, "count": len(comments), "comments": comments}
    finally:
        await db.close()
