"""
LLM & SEO Generator (The Knowledge Moat).
Connects to SQLite database and produces two high-value assets:
1. schema_org.json: Structured JSON-LD (Schema.org TechArticle & HowTo) for search engines
   and AI crawler citation grounding (Perplexity, Google SGE, OpenAI Search).
2. llm-context.md: A clean, flat, highly structured Markdown file optimized for RAG vector databases
   (ChromaDB, Pinecone, Weaviate, pgvector) with device specifications and exact ADB troubleshooting commands.
"""

import sys
import os
import json
import asyncio
import logging

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from database import get_db_connection
    HAS_AIOSQLITE = True
except ImportError:
    HAS_AIOSQLITE = False

import sqlite3

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("streaming_intel.generate_rag")

DB_PATH = os.getenv("DATABASE_PATH", "streaming_intel.db")

def get_sync_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

async def generate_assets(output_dir: str = "."):
    logger.info("Connecting to database for RAG & Schema.org asset generation...")
    
    if HAS_AIOSQLITE:
        db = await get_db_connection()
        dev_cursor = await db.execute("SELECT id, name, ecosystem, release_date, specs_json FROM devices ORDER BY id ASC;")
        devices = [dict(r) for r in await dev_cursor.fetchall()]
        issue_cursor = await db.execute("""
            SELECT i.id, i.device_id, i.title, i.description, i.severity, i.created_at,
                   d.name as device_name, d.ecosystem
            FROM issues i
            LEFT JOIN devices d ON i.device_id = d.id
            ORDER BY i.id ASC;
        """)
        issues = [dict(r) for r in await issue_cursor.fetchall()]
        sol_cursor = await db.execute("SELECT id, issue_id, method, command_code, success_rate FROM solutions ORDER BY id ASC;")
        solutions = [dict(r) for r in await sol_cursor.fetchall()]
        await db.close()
    else:
        conn = get_sync_connection()
        devices = [dict(r) for r in conn.execute("SELECT id, name, ecosystem, release_date, specs_json FROM devices ORDER BY id ASC;").fetchall()]
        issues = [dict(r) for r in conn.execute("""
            SELECT i.id, i.device_id, i.title, i.description, i.severity, i.created_at,
                   d.name as device_name, d.ecosystem
            FROM issues i
            LEFT JOIN devices d ON i.device_id = d.id
            ORDER BY i.id ASC;
        """).fetchall()]
        solutions = [dict(r) for r in conn.execute("SELECT id, issue_id, method, command_code, success_rate FROM solutions ORDER BY id ASC;").fetchall()]
        conn.close()

    try:
        # Map solutions by issue_id
        solutions_by_issue = {}
        for s in solutions:
            solutions_by_issue.setdefault(s["issue_id"], []).append(s)

        # 1. GENERATE SCHEMA_ORG.JSON (JSON-LD)
        logger.info("Generating schema_org.json (Schema.org TechArticle & HowTo)...")
        schema_graph = []

        for issue in issues:
            issue_solutions = solutions_by_issue.get(issue["id"], [])
            howto_steps = []
            for idx, sol in enumerate(issue_solutions, start=1):
                howto_steps.append({
                    "@type": "HowToStep",
                    "position": idx,
                    "name": f"Method: {sol['method']}",
                    "text": sol["command_code"],
                    "itemListElement": [{
                        "@type": "HowToDirection",
                        "text": f"Apply {sol['method']} workaround: {sol['command_code']}"
                    }]
                })

            item_schema = {
                "@context": "https://schema.org",
                "@type": "TechArticle",
                "headline": issue["title"],
                "description": issue["description"],
                "articleSection": "Streaming Device Troubleshooting",
                "keywords": f"{issue.get('ecosystem', 'Streaming')}, ADB, Sideload, {issue.get('device_name', '')}",
                "about": {
                    "@type": "Product",
                    "name": issue.get("device_name", "Streaming Device"),
                    "brand": issue.get("ecosystem", "Tech")
                },
                "hasPart": {
                    "@type": "HowTo",
                    "name": f"How to resolve: {issue['title']}",
                    "step": howto_steps
                }
            }
            schema_graph.append(item_schema)

        schema_file_path = os.path.join(output_dir, "schema_org.json")
        with open(schema_file_path, "w", encoding="utf-8") as f:
            json.dump({
                "@context": "https://schema.org",
                "@graph": schema_graph
            }, f, indent=2)
        logger.info(f"Wrote structured schema to: {schema_file_path}")

        # 2. GENERATE LLM-CONTEXT.MD (Optimized for RAG Vector Databases)
        logger.info("Generating llm-context.md (RAG ingestion corpus)...")
        md_lines = [
            "# Proprietary Streaming Intelligence Platform: Hardware & Troubleshooting Corpus",
            "",
            "> Document Purpose: Canonical knowledge base for LLM retrieval-augmented generation (RAG).",
            "> Domain: Amazon Fire TV, Google TV, Roku OS, Apple TV, Android TV ADB debugging, sideloading, and recovery.",
            "",
            "---",
            "",
            "## SECTION 1: HARDWARE PROFILES & ARCHITECTURE",
            ""
        ]

        for d in devices:
            specs = json.loads(d["specs_json"]) if d["specs_json"] else {}
            md_lines.append(f"### Device: {d['name']}")
            md_lines.append(f"- **Ecosystem**: {d['ecosystem']}")
            md_lines.append(f"- **Release Date**: {d['release_date']}")
            for k, v in specs.items():
                md_lines.append(f"- **{k.upper()}**: {v}")
            md_lines.append("")

        md_lines.extend([
            "---",
            "",
            "## SECTION 2: SYSTEM ISSUES & TESTED WORKAROUND MATRIX",
            ""
        ])

        for issue in issues:
            md_lines.append(f"### [Issue #{issue['id']}] {issue['title']}")
            md_lines.append(f"- **Affected Device**: {issue.get('device_name', 'Unknown')}")
            md_lines.append(f"- **Severity Level**: {issue['severity'].upper()}")
            md_lines.append(f"- **Detailed Symptom & Root Cause**:")
            md_lines.append(f"  {issue['description']}")
            md_lines.append("")

            issue_sols = solutions_by_issue.get(issue["id"], [])
            if issue_sols:
                md_lines.append(f"- **Verified Solutions**:")
                for s in issue_sols:
                    md_lines.append(f"  - **Method**: `{s['method']}` (Success Rate: {int(s['success_rate'] * 100)}%)")
                    md_lines.append(f"    - Command / Steps: `{s['command_code']}`")
            else:
                md_lines.append("- **Verified Solutions**: Under active community investigation.")
            md_lines.append("")

        md_lines.extend([
            "---",
            "",
            "## SECTION 3: DOWNLOADING, SHORTCODES, AND ELEPHANT / SIDELOADING WORKFLOWS",
            "",
            "### Universal Package Loader & Shortcode Architecture",
            "1. **Shortcode Resolver**: System accepts 5-digit numeric codes that redirect via HTTP 301/302 to direct verified binary downloads.",
            "2. **Installing Third-Party Packages (e.g. Elephant TV, SmartTube, Kodi)**:",
            "   - Step A: Go to Fire TV Settings -> My Fire TV -> About -> Click device name 7 times to unlock Developer Options.",
            "   - Step B: Go to Developer Options -> Install unknown apps -> Enable the loader app.",
            "   - Step C: Launch loader -> Enter numeric shortcode or direct binary URL -> Click GO.",
            "   - Step D: Once APK downloads, tap Install.",
            "3. **FireOS 8 Restrictions & ADB Bypass**:",
            "   - On FireOS 8 (e.g., Fire TV Stick 4K Max 2nd Gen), Amazon restricts background service installation.",
            "   - Bypass Command: `adb connect <IP>:5555 && adb install -r -d target.apk`",
            "   - If verifier fails: `adb shell settings put global verifier_verify_adb_installs 0`",
            ""
        ])

        llm_context_path = os.path.join(output_dir, "llm-context.md")
        with open(llm_context_path, "w", encoding="utf-8") as f:
            f.write("\n".join(md_lines))
        logger.info(f"Wrote flat RAG markdown corpus to: {llm_context_path}")

    except Exception as e:
        logger.error(f"Error generating RAG assets: {e}")
        raise e

if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    asyncio.run(generate_assets(out_dir))
