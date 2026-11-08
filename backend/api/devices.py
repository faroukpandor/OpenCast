"""
Devices API module.
Provides hardware specifications, ecosystem categorization, ADB port configurations,
and bootloader statuses for streaming hardware (Fire TV, Google TV, Roku, Apple TV).
"""

import json
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db_connection

router = APIRouter(prefix="/devices", tags=["devices"])

@router.get("")
async def list_devices(ecosystem: Optional[str] = None):
    """
    Returns list of streaming hardware devices.
    """
    db = await get_db_connection()
    try:
        query = "SELECT id, name, ecosystem, release_date, specs_json FROM devices"
        params = []
        if ecosystem:
            query += " WHERE ecosystem = ?"
            params.append(ecosystem)
        query += " ORDER BY id ASC;"

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        devices = []
        for r in rows:
            specs = json.loads(r["specs_json"]) if r["specs_json"] else {}
            # Count issues for this device
            i_cursor = await db.execute("SELECT COUNT(*) FROM issues WHERE device_id = ?;", (r["id"],))
            issues_count = (await i_cursor.fetchone())[0]

            devices.append({
                "id": r["id"],
                "name": r["name"],
                "ecosystem": r["ecosystem"],
                "release_date": r["release_date"],
                "specs": specs,
                "issues_count": issues_count
            })
        return devices
    finally:
        await db.close()

@router.get("/{device_id}")
async def get_device(device_id: int):
    """
    Returns single device specs with all associated issues.
    """
    db = await get_db_connection()
    try:
        cursor = await db.execute(
            "SELECT id, name, ecosystem, release_date, specs_json FROM devices WHERE id = ?;",
            (device_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Device not found")

        specs = json.loads(row["specs_json"]) if row["specs_json"] else {}

        # Fetch issues for this device
        i_cursor = await db.execute(
            "SELECT id, title, description, severity, created_at FROM issues WHERE device_id = ? ORDER BY id DESC;",
            (device_id,)
        )
        issues = [dict(i) for i in await i_cursor.fetchall()]

        return {
            "id": row["id"],
            "name": row["name"],
            "ecosystem": row["ecosystem"],
            "release_date": row["release_date"],
            "specs": specs,
            "issues": issues
        }
    finally:
        await db.close()
