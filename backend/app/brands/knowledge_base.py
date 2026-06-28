"""Brand knowledge base — small curated set of YAML records.

Lookups are alias-aware and case-insensitive. The KB is loaded once at module
import. To add a new brand, drop a YAML file in `data/` and re-import (or
restart the server).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml

from ..schemas import BrandRecord


_DATA_DIR = Path(__file__).parent / "data"


@lru_cache(maxsize=1)
def _load_all() -> list[BrandRecord]:
    out: list[BrandRecord] = []
    for path in sorted(_DATA_DIR.glob("*.yaml")):
        with path.open() as f:
            payload = yaml.safe_load(f)
        if payload is None:
            continue
        out.append(BrandRecord.model_validate(payload))
    return out


def all_brands() -> list[BrandRecord]:
    return list(_load_all())


def lookup_brand(name: str | None) -> BrandRecord | None:
    if not name:
        return None
    needle = name.strip().lower()
    for record in _load_all():
        if record.canonical_name.lower() == needle:
            return record
        if any(alias.lower() == needle for alias in record.aliases):
            return record
    # Loose contains-match as a last resort — "J.Crew Flex Washed" → "J.Crew".
    for record in _load_all():
        if record.canonical_name.lower() in needle:
            return record
        if any(alias.lower() in needle for alias in record.aliases):
            return record
    return None
