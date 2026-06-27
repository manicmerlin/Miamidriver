"""Marketplace URL parsing + per-site HTML extractors.

Each extractor returns a `SourceGarment`. They are best-effort — anti-bot
challenges, JS-rendered pages, and silent HTML drift will all degrade results.
We keep partial data (title only, photos only) rather than failing the whole
request; the fit-profile builder treats any missing field as low-confidence.
"""

from .url_parser import detect_marketplace, fetch_source_garment

__all__ = ["detect_marketplace", "fetch_source_garment"]
