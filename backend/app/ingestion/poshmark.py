"""Poshmark listing extractor.

Poshmark exposes a `__INITIAL_STATE__` JS object and decent JSON-LD. We accept
either route. Sellers there rarely state measurements — most fields will be
brand/size/title only.
"""

from __future__ import annotations

import json
import re
from typing import Any

from pydantic import HttpUrl
from selectolax.parser import HTMLParser

from ..schemas import Confidence, Marketplace, Signal, SourceGarment
from ._common import parse_measurements, parse_og_meta


_INITIAL_STATE_RE = re.compile(
    r"window\.__INITIAL_STATE__\s*=\s*(\{.+?\})\s*;\s*</script", re.S
)


def _walk(value: Any, key: str) -> Any:
    if isinstance(value, dict):
        if key in value:
            return value[key]
        for v in value.values():
            found = _walk(v, key)
            if found is not None:
                return found
    elif isinstance(value, list):
        for item in value:
            found = _walk(item, key)
            if found is not None:
                return found
    return None


def extract(*, url: str, html: str, marketplace: Marketplace) -> SourceGarment:
    tree = HTMLParser(html)
    og = parse_og_meta(tree)
    title = og.title
    description = og.description

    brand_value: str | None = None
    size_value: str | None = None
    photo_urls: list[str] = list(og.image_urls or [])

    match = _INITIAL_STATE_RE.search(html)
    if match:
        try:
            state = json.loads(match.group(1))
        except (json.JSONDecodeError, ValueError):
            state = None
        if state:
            title = _walk(state, "title") or title
            description = _walk(state, "description") or description
            brand_value = _walk(state, "brand") or brand_value
            size = _walk(state, "size_obj") or _walk(state, "sizeObj") or _walk(state, "size")
            if isinstance(size, dict):
                size_value = size.get("display") or size.get("display_with_size_set")
            elif isinstance(size, str):
                size_value = size
            pics = _walk(state, "picture_urls") or _walk(state, "pictures") or []
            if isinstance(pics, list):
                for p in pics:
                    if isinstance(p, str):
                        photo_urls.append(p)
                    elif isinstance(p, dict):
                        candidate = p.get("url") or p.get("original")
                        if isinstance(candidate, str):
                            photo_urls.append(candidate)

    return SourceGarment(
        source_kind="url",
        source_url=HttpUrl(url),
        marketplace=marketplace,
        title=title,
        description=description,
        photo_urls=[HttpUrl(u) for u in dict.fromkeys(photo_urls)],
        brand=(
            Signal(value=brand_value, confidence=Confidence.high, source="poshmark:state.brand")
            if brand_value
            else None
        ),
        size=(
            Signal(value=size_value, confidence=Confidence.high, source="poshmark:state.size")
            if size_value
            else None
        ),
        raw_seller_size_label=size_value,
        measurements=parse_measurements(description),
    )
