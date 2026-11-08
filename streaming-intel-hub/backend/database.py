"""
Database module for Proprietary Streaming Intelligence Platform.
Uses aiosqlite for non-blocking asynchronous SQLite operations.
Zero third-party SaaS dependencies. Full data ownership.
"""

import os
import json
import logging
import aiosqlite
from typing import Optional, List, Dict, Any

logger = logging.getLogger("streaming_intel.database")

DB_PATH = os.getenv("DATABASE_PATH", "streaming_intel.db")

async def get_db_connection() -> aiosqlite.Connection:
    """Returns an aiosqlite connection with row_factory set to Row."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON;")
    return db

async def init_db():
    """Initializes SQLite schema and seeds standard streaming devices and known issues."""
    logger.info(f"Initializing SQLite database at: {DB_PATH}")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON;")

        # 1. devices table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                ecosystem TEXT NOT NULL,
                release_date TEXT,
                specs_json TEXT
            );
        """)

        # 2. issues table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS issues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
            );
        """)

        # 3. solutions table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS solutions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                issue_id INTEGER,
                method TEXT NOT NULL CHECK(method IN ('ADB', 'Settings', 'Software', 'Hardware')),
                command_code TEXT,
                success_rate REAL DEFAULT 0.95,
                FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
            );
        """)

        # 4. sources table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE,
                platform TEXT NOT NULL CHECK(platform IN ('Reddit', 'YouTube', 'RSS')),
                last_scraped TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 5. analytics_events table (NO IP ADDRESSES RECORDED - GDPR compliant)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS analytics_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                page_url TEXT NOT NULL,
                referrer TEXT,
                device_type TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 6. users table (Authentication)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                token TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 7. comments table (Cryptographic Proof of Work & user association)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                page_slug TEXT NOT NULL,
                author_hash TEXT NOT NULL,
                user_id INTEGER,
                content TEXT NOT NULL,
                proof_of_work_nonce TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
        """)

        # Try to initialize SQLite FTS5 for fast full-text keyword searches
        try:
            await db.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS issues_fts USING fts5(
                    title,
                    description,
                    content='issues',
                    content_rowid='id'
                );
            """)
            await db.execute("""
                CREATE TRIGGER IF NOT EXISTS issues_ai AFTER INSERT ON issues BEGIN
                    INSERT INTO issues_fts(rowid, title, description) VALUES (new.id, new.title, new.description);
                END;
            """)
            await db.execute("""
                CREATE TRIGGER IF NOT EXISTS issues_ad AFTER DELETE ON issues BEGIN
                    INSERT INTO issues_fts(issues_fts, rowid, title, description) VALUES('delete', old.id, old.title, old.description);
                END;
            """)
            await db.execute("""
                CREATE TRIGGER IF NOT EXISTS issues_au AFTER UPDATE ON issues BEGIN
                    INSERT INTO issues_fts(issues_fts, rowid, title, description) VALUES('delete', old.id, old.title, old.description);
                    INSERT INTO issues_fts(rowid, title, description) VALUES (new.id, new.title, new.description);
                END;
            """)
        except Exception as e:
            logger.warning(f"FTS5 setup skipped or fallback enabled: {e}")

        # Seed initial devices if empty
        cursor = await db.execute("SELECT COUNT(*) FROM devices;")
        row = await cursor.fetchone()
        if row and row[0] == 0:
            await seed_initial_data(db)

        await db.commit()
    logger.info("Database schema verification and initial seed completed.")

async def seed_initial_data(db: aiosqlite.Connection):
    """Populates realistic streaming devices, known issues, and tested ADB solutions."""
    devices = [
        (
            1,
            "Amazon Fire TV Stick 4K Max (2nd Gen)",
            "Amazon",
            "2023-10-18",
            json.dumps({
                "soc": "MediaTek MT8696T Quad-core 2.0 GHz",
                "gpu": "IMG GE9215 850 MHz",
                "ram": "2 GB LPDDR4",
                "storage": "16 GB",
                "os": "FireOS 8 (Android 11 base)",
                "adb_port": 5555,
                "wifi": "Wi-Fi 6E (802.11ax)",
                "hdr": "Dolby Vision, HDR10+, HDR10, HLG",
                "audio": "Dolby Atmos, 7.1 surround sound"
            })
        ),
        (
            2,
            "Chromecast with Google TV (4K)",
            "Google",
            "2020-09-30",
            json.dumps({
                "soc": "Amlogic S905X3 Quad-core 1.9 GHz",
                "gpu": "Mali-G31 MP2",
                "ram": "2 GB",
                "storage": "8 GB",
                "os": "Google TV (Android 12)",
                "adb_port": 5555,
                "wifi": "Wi-Fi 5 (802.11ac)",
                "hdr": "Dolby Vision, HDR10, HDR10+",
                "audio": "Dolby Digital, Dolby Digital Plus, Dolby Atmos"
            })
        ),
        (
            3,
            "Walmart onn. Google TV 4K Pro Streaming Box",
            "Google",
            "2024-05-06",
            json.dumps({
                "soc": "Amlogic S905X4 Quad-core 2.0 GHz",
                "gpu": "Mali-G31 MP2",
                "ram": "3 GB",
                "storage": "32 GB",
                "os": "Google TV (Android 12)",
                "adb_port": 5555,
                "wifi": "Wi-Fi 6",
                "hdr": "Dolby Vision, HDR10",
                "audio": "Dolby Atmos"
            })
        ),
        (
            4,
            "Roku Ultra (4802R)",
            "Roku",
            "2022-04-12",
            json.dumps({
                "soc": "Realtek RTD1319 Quad-core",
                "ram": "2 GB",
                "storage": "4 GB (USB expandable)",
                "os": "Roku OS 13.0",
                "adb_port": 8060,
                "wifi": "Wi-Fi 5 Dual-band",
                "hdr": "Dolby Vision, HDR10+",
                "audio": "Dolby Atmos pass-through"
            })
        ),
        (
            5,
            "Apple TV 4K (3rd Gen)",
            "Apple",
            "2022-11-04",
            json.dumps({
                "soc": "Apple A15 Bionic (5-core CPU)",
                "ram": "4 GB",
                "storage": "64 GB / 128 GB",
                "os": "tvOS 17.4+",
                "adb_port": 0,
                "wifi": "Wi-Fi 6 (802.11ax) with MIMO",
                "hdr": "Dolby Vision, HDR10+",
                "audio": "Dolby Atmos 7.1.4"
            })
        )
    ]

    for d in devices:
        await db.execute(
            "INSERT INTO devices (id, name, ecosystem, release_date, specs_json) VALUES (?, ?, ?, ?, ?);",
            d
        )

    issues_and_solutions = [
        {
            "device_id": 1,
            "title": "FireOS 8 blocks ADB package installer for third-party APKs",
            "description": "Amazon firmware update RS8104 enforces strict verification when installing via adb install, returning INSTALL_FAILED_VERIFICATION_FAILURE.",
            "severity": "high",
            "solutions": [
                {
                    "method": "ADB",
                    "command_code": "adb shell settings put global verifier_verify_adb_installs 0 && adb install -r -d app.apk",
                    "success_rate": 0.98
                },
                {
                    "method": "Settings",
                    "command_code": "Settings -> My Fire TV -> Developer Options -> Install unknown apps -> Enable for Downloader / File Manager",
                    "success_rate": 0.92
                }
            ]
        },
        {
            "device_id": 1,
            "title": "Custom launcher disabled by Fire TV Home update",
            "description": "Amazon silently disables custom launchers (Wolf, Projectivy, FLauncher) after background OTA patch to com.amazon.tv.launcher.",
            "severity": "critical",
            "solutions": [
                {
                    "method": "ADB",
                    "command_code": "adb shell pm disable-user --user 0 com.amazon.device.sale.service && adb shell appops set com.spocky.projengmenu SYSTEM_ALERT_WINDOW allow",
                    "success_rate": 0.94
                }
            ]
        },
        {
            "device_id": 1,
            "title": "Downloader by AFTVnews shortcode fails to fetch APK redirect",
            "description": "Users attempting to install Elephant, SmartTube or Kodi via AFTVnews shortcode encounter SSL handshake or connection timeout on FireOS 8.",
            "severity": "medium",
            "solutions": [
                {
                    "method": "ADB",
                    "command_code": "curl -L -o elephant.apk 'https://repo.example.org/elephant.apk' && adb install -r elephant.apk",
                    "success_rate": 0.99
                },
                {
                    "method": "Settings",
                    "command_code": "In Downloader app: Settings -> Enable JavaScript -> Clear Cookies and Cache -> Re-enter shortcode",
                    "success_rate": 0.88
                }
            ]
        },
        {
            "device_id": 2,
            "title": "Google TV 4K sideload APK permission denied in file manager",
            "description": "Android 12 on Chromecast with Google TV hides Developer Options and revokes REQUEST_INSTALL_PACKAGES for non-Play Store managers.",
            "severity": "medium",
            "solutions": [
                {
                    "method": "Settings",
                    "command_code": "Settings -> System -> About -> Click 'Android TV OS build' 7 times -> Go to System -> Developer options -> USB debugging -> ON",
                    "success_rate": 0.96
                },
                {
                    "method": "ADB",
                    "command_code": "adb shell appops set com.apk.installer REQUEST_INSTALL_PACKAGES allow",
                    "success_rate": 0.95
                }
            ]
        },
        {
            "device_id": 2,
            "title": "Chromecast 4K storage full bootloop warning",
            "description": "With only 4.4GB usable internal flash, cached APK downloads from Downloader trigger storage exhaustion and bootloop.",
            "severity": "high",
            "solutions": [
                {
                    "method": "ADB",
                    "command_code": "adb shell pm trim-caches 1000M && adb shell rm -rf /sdcard/Download/*",
                    "success_rate": 0.97
                }
            ]
        },
        {
            "device_id": 3,
            "title": "Walmart onn. 4K Pro microphone button remapping",
            "description": "User requested remapping the dedicated Free TV button to launch custom launcher or SmartTube.",
            "severity": "low",
            "solutions": [
                {
                    "method": "ADB",
                    "command_code": "adb shell appops set flar2.homebutton SYSTEM_ALERT_WINDOW allow && adb shell pm grant flar2.homebutton android.permission.WRITE_SECURE_SETTINGS",
                    "success_rate": 0.95
                }
            ]
        },
        {
            "device_id": 4,
            "title": "Roku Developer Mode secret installer access",
            "description": "Roku does not support standard Android APK sideloading; sideloading requires Roku developer screen and zip packaging.",
            "severity": "medium",
            "solutions": [
                {
                    "method": "Settings",
                    "command_code": "Remote sequence: Home 3x, Up 2x, Right, Left, Right, Left, Right. Record IP & password -> Access http://ROKU_IP to upload packaged dev zip.",
                    "success_rate": 0.91
                }
            ]
        }
    ]

    for item in issues_and_solutions:
        cursor = await db.execute(
            "INSERT INTO issues (device_id, title, description, severity) VALUES (?, ?, ?, ?);",
            (item["device_id"], item["title"], item["description"], item["severity"])
        )
        issue_id = cursor.lastrowid
        for sol in item["solutions"]:
            await db.execute(
                "INSERT INTO solutions (issue_id, method, command_code, success_rate) VALUES (?, ?, ?, ?);",
                (issue_id, sol["method"], sol["command_code"], sol["success_rate"])
            )

    # Seed public sources for scraper daemon
    sources = [
        ("https://www.reddit.com/r/FireTV/new.json", "Reddit"),
        ("https://www.reddit.com/r/AndroidTV/new.json", "Reddit"),
        ("https://www.youtube.com/feeds/videos.xml?channel_id=UCvXN2Bf36-5lGZ8eQ8Q8q3w", "YouTube")
    ]
    for s in sources:
        await db.execute("INSERT OR IGNORE INTO sources (url, platform) VALUES (?, ?);", s)
