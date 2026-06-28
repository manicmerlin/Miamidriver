"""SQLite-backed persistence + the "similar fit" learning loop.

Schema:
  fit_profile           — saved profiles, one row per ingested+saved garment
  cross_match_seen      — every (source profile, target chart) we've surfaced
  find_more_event       — user-tapped "find more like this"
  learned_pair          — derived similarity weight per (key_a, key_b)

The learning loop:
  1. Whenever we return cross-matches for a profile, bump `cross_match_seen`.
  2. When the user taps "find more like this" on one of those candidates, we
     insert into `find_more_event` AND bump `learned_pair` by +1.
  3. The cross-match engine's similarity_boost() reduces distance for pairs
     that have accumulated reinforcement — so the same brand/line/era/size
     combo the user keeps coming back to floats to the top in future searches.

We store the chart "key" as a stable hash: brand|line|era|size lowercased.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import time
from pathlib import Path
from typing import Iterator

from ..config import settings
from ..schemas import FitProfile


_DB_PATH = settings.data_dir / "vintagefit.sqlite"


def init_db() -> None:
    conn = sqlite3.connect(_DB_PATH)
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS fit_profile (
                id TEXT PRIMARY KEY,
                created_at REAL NOT NULL,
                brand TEXT,
                line TEXT,
                era_label TEXT,
                garment_type TEXT,
                size_label TEXT,
                country_of_origin TEXT,
                fabric_content TEXT,
                payload TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS cross_match_seen (
                source_profile_id TEXT NOT NULL,
                target_chart_key TEXT NOT NULL,
                times_shown INTEGER NOT NULL DEFAULT 1,
                last_seen_at REAL NOT NULL,
                PRIMARY KEY (source_profile_id, target_chart_key)
            );

            CREATE TABLE IF NOT EXISTS find_more_event (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_profile_id TEXT NOT NULL,
                target_chart_key TEXT NOT NULL,
                created_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS learned_pair (
                key_a TEXT NOT NULL,
                key_b TEXT NOT NULL,
                weight REAL NOT NULL DEFAULT 0,
                updated_at REAL NOT NULL,
                PRIMARY KEY (key_a, key_b)
            );

            CREATE INDEX IF NOT EXISTS ix_find_more_source
                ON find_more_event (source_profile_id);

            CREATE INDEX IF NOT EXISTS ix_cross_match_source
                ON cross_match_seen (source_profile_id);
            """
        )
        conn.commit()
    finally:
        conn.close()


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def chart_key(brand: str | None, line: str | None, era_label: str | None, size_label: str | None) -> str:
    parts = [brand or "?", line or "?", era_label or "?", size_label or "?"]
    h = "|".join(p.strip().lower() for p in parts)
    return h


def profile_key(profile: FitProfile) -> str:
    return chart_key(profile.brand, profile.line, profile.era_label, profile.size_label)


# -- writes --------------------------------------------------------------------


def save_profile(profile: FitProfile) -> str:
    now = time.time()
    payload = profile.model_dump_json()
    conn = get_db()
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO fit_profile
              (id, created_at, brand, line, era_label, garment_type, size_label,
               country_of_origin, fabric_content, payload)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                profile.id,
                now,
                profile.brand,
                profile.line,
                profile.era_label,
                profile.garment_type.value,
                profile.size_label,
                profile.country_of_origin,
                profile.fabric_content,
                payload,
            ),
        )
        conn.commit()
        return profile.id
    finally:
        conn.close()


def record_cross_match_shown(source_profile_id: str, target_keys: list[str]) -> None:
    if not target_keys:
        return
    now = time.time()
    conn = get_db()
    try:
        for key in target_keys:
            conn.execute(
                """
                INSERT INTO cross_match_seen (source_profile_id, target_chart_key, times_shown, last_seen_at)
                VALUES (?, ?, 1, ?)
                ON CONFLICT(source_profile_id, target_chart_key)
                DO UPDATE SET times_shown = times_shown + 1, last_seen_at = ?
                """,
                (source_profile_id, key, now, now),
            )
        conn.commit()
    finally:
        conn.close()


def record_find_more_event(source_profile_id: str, target_chart_key: str) -> None:
    """Reinforce the learned similarity between the source profile's chart
    and the target chart. Bumps weight by +1.
    """
    now = time.time()
    src_chart_key = _load_profile_chart_key(source_profile_id)
    if not src_chart_key:
        return
    a, b = sorted([src_chart_key, target_chart_key])
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO find_more_event (source_profile_id, target_chart_key, created_at) VALUES (?, ?, ?)",
            (source_profile_id, target_chart_key, now),
        )
        conn.execute(
            """
            INSERT INTO learned_pair (key_a, key_b, weight, updated_at)
            VALUES (?, ?, 1.0, ?)
            ON CONFLICT(key_a, key_b)
            DO UPDATE SET weight = weight + 1.0, updated_at = ?
            """,
            (a, b, now, now),
        )
        conn.commit()
    finally:
        conn.close()


# -- reads ---------------------------------------------------------------------


def list_profiles() -> list[FitProfile]:
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT payload FROM fit_profile ORDER BY created_at DESC"
        ).fetchall()
        return [FitProfile.model_validate_json(r["payload"]) for r in rows]
    finally:
        conn.close()


def load_profile(profile_id: str) -> FitProfile | None:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT payload FROM fit_profile WHERE id = ?", (profile_id,)
        ).fetchone()
        return FitProfile.model_validate_json(row["payload"]) if row else None
    finally:
        conn.close()


def _load_profile_chart_key(profile_id: str) -> str | None:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT brand, line, era_label, size_label FROM fit_profile WHERE id = ?",
            (profile_id,),
        ).fetchone()
        if not row:
            return None
        return chart_key(row["brand"], row["line"], row["era_label"], row["size_label"])
    finally:
        conn.close()


def similarity_boost(source_chart_key: str) -> dict[str, float]:
    """For a source chart key, return {target_key: bonus} where bonus is the
    learned weight of pairs involving source_chart_key.

    The caller subtracts a fraction of this from the normalized cross-match
    distance, so reinforced pairs float to the top.
    """
    conn = get_db()
    try:
        rows = conn.execute(
            """
            SELECT key_a, key_b, weight FROM learned_pair
            WHERE key_a = ? OR key_b = ?
            """,
            (source_chart_key, source_chart_key),
        ).fetchall()
    finally:
        conn.close()
    boosts: dict[str, float] = {}
    for r in rows:
        other = r["key_b"] if r["key_a"] == source_chart_key else r["key_a"]
        if other == source_chart_key:
            continue
        boosts[other] = max(boosts.get(other, 0.0), float(r["weight"]))
    return boosts


# -- iteration helper for tests ------------------------------------------------


def reset_for_test() -> None:
    """Wipe and re-init the database. Test-only convenience."""
    if _DB_PATH.exists():
        _DB_PATH.unlink()
    init_db()
