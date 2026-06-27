"""Shared extraction helpers — measurement regexes, OG-tag fallbacks, brand sniffing.

The measurement regex is the workhorse: most marketplace listings have free-text
seller-stated measurements that look like 'pit to pit 22"' or 'length: 30in'.
We don't try to be exhaustive — we accept partial matches and keep them with a
'listing-stated' source so the UI can show what came from where.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from selectolax.parser import HTMLParser

from ..schemas import Confidence, Measurement


_MEASUREMENT_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (
        "chest",
        re.compile(
            r"(?:pit[\s\-]*to[\s\-]*pit|p2p|chest|armpit[\s\-]*to[\s\-]*armpit)[\s:\-]*([0-9]+(?:\.[0-9]+)?)\s*(in|inches|\"|cm)?",
            re.I,
        ),
    ),
    (
        "shoulder",
        re.compile(
            r"shoulder(?:s)?(?:\s*(?:width|seam))?[\s:\-]*([0-9]+(?:\.[0-9]+)?)\s*(in|inches|\"|cm)?",
            re.I,
        ),
    ),
    (
        "sleeve",
        re.compile(
            r"sleeve(?:\s*length)?[\s:\-]*([0-9]+(?:\.[0-9]+)?)\s*(in|inches|\"|cm)?",
            re.I,
        ),
    ),
    (
        "length",
        re.compile(
            r"(?:back\s*length|total\s*length|length|hem)[\s:\-]*([0-9]+(?:\.[0-9]+)?)\s*(in|inches|\"|cm)?",
            re.I,
        ),
    ),
    (
        "waist",
        re.compile(
            r"waist(?:\s*(?:flat|laid\s*flat))?[\s:\-]*([0-9]+(?:\.[0-9]+)?)\s*(in|inches|\"|cm)?",
            re.I,
        ),
    ),
    (
        "hip",
        re.compile(
            r"hip(?:s)?[\s:\-]*([0-9]+(?:\.[0-9]+)?)\s*(in|inches|\"|cm)?",
            re.I,
        ),
    ),
    (
        "rise",
        re.compile(
            r"(?:front\s*)?rise[\s:\-]*([0-9]+(?:\.[0-9]+)?)\s*(in|inches|\"|cm)?",
            re.I,
        ),
    ),
    (
        "inseam",
        re.compile(
            r"inseam[\s:\-]*([0-9]+(?:\.[0-9]+)?)\s*(in|inches|\"|cm)?",
            re.I,
        ),
    ),
    (
        "thigh",
        re.compile(
            r"thigh[\s:\-]*([0-9]+(?:\.[0-9]+)?)\s*(in|inches|\"|cm)?",
            re.I,
        ),
    ),
    (
        "neck",
        re.compile(
            r"(?:neck|collar)[\s:\-]*([0-9]+(?:\.[0-9]+)?)\s*(in|inches|\"|cm)?",
            re.I,
        ),
    ),
]


def parse_measurements(text: str | None) -> list[Measurement]:
    if not text:
        return []
    out: list[Measurement] = []
    seen: set[str] = set()
    for name, pattern in _MEASUREMENT_PATTERNS:
        match = pattern.search(text)
        if not match or name in seen:
            continue
        try:
            value = float(match.group(1))
        except ValueError:
            continue
        # Skip nonsensical hits — listings often contain phone numbers, prices.
        if not 1 < value < 200:
            continue
        raw_unit = (match.group(2) or "").lower()
        unit = "cm" if raw_unit == "cm" else "in"
        out.append(
            Measurement(
                name=name,  # type: ignore[arg-type]
                value=value,
                unit=unit,
                source="listing-stated",
                confidence=Confidence.medium,
            )
        )
        seen.add(name)
    return out


@dataclass
class OgMeta:
    title: str | None = None
    description: str | None = None
    image_urls: list[str] | None = None


def parse_og_meta(html: HTMLParser) -> OgMeta:
    title = _meta_content(html, "og:title") or (html.css_first("title").text() if html.css_first("title") else None)
    description = _meta_content(html, "og:description") or _meta_content(html, "description")
    images: list[str] = []
    for node in html.css('meta[property="og:image"], meta[name="og:image"]'):
        content = node.attributes.get("content")
        if content:
            images.append(content)
    return OgMeta(title=title, description=description, image_urls=images or None)


def _meta_content(html: HTMLParser, key: str) -> str | None:
    node = html.css_first(f'meta[property="{key}"]') or html.css_first(f'meta[name="{key}"]')
    if node:
        return node.attributes.get("content")
    return None
