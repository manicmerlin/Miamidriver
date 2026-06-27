"""Fallback extractor for any URL we don't have a specialized parser for.

Pulls Open Graph + JSON-LD only. Measurements parsed from description text.
"""

from __future__ import annotations

import json
from typing import Any

from pydantic import HttpUrl
from selectolax.parser import HTMLParser

from ..schemas import Confidence, Marketplace, Signal, SourceGarment
from ._common import parse_measurements, parse_og_meta


def _iter_jsonld(tree: HTMLParser) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for node in tree.css('script[type="application/ld+json"]'):
        try:
            data = json.loads(node.text())
        except (json.JSONDecodeError, ValueError):
            continue
        if isinstance(data, list):
            out.extend(d for d in data if isinstance(d, dict))
        elif isinstance(data, dict):
            out.append(data)
    return out


def extract(*, url: str, html: str, marketplace: Marketplace) -> SourceGarment:
    tree = HTMLParser(html)
    og = parse_og_meta(tree)
    title = og.title
    description = og.description
    brand_value: str | None = None
    size_value: str | None = None
    photo_urls: list[str] = list(og.image_urls or [])

    for blob in _iter_jsonld(tree):
        t = blob.get("@type")
        if t == "Product" or (isinstance(t, list) and "Product" in t):
            title = blob.get("name") or title
            description = blob.get("description") or description
            brand = blob.get("brand")
            if isinstance(brand, dict):
                brand_value = brand.get("name") or brand_value
            elif isinstance(brand, str):
                brand_value = brand
            image = blob.get("image")
            if isinstance(image, str):
                photo_urls.append(image)
            elif isinstance(image, list):
                photo_urls.extend(i for i in image if isinstance(i, str))
            size_value = blob.get("size") or size_value
            break

    return SourceGarment(
        source_kind="url",
        source_url=HttpUrl(url),
        marketplace=marketplace,
        title=title,
        description=description,
        photo_urls=[HttpUrl(u) for u in dict.fromkeys(photo_urls)],
        brand=(
            Signal(value=brand_value, confidence=Confidence.medium, source="generic:jsonld")
            if brand_value
            else None
        ),
        size=(
            Signal(value=size_value, confidence=Confidence.medium, source="generic:jsonld")
            if size_value
            else None
        ),
        raw_seller_size_label=size_value,
        measurements=parse_measurements(description),
    )
