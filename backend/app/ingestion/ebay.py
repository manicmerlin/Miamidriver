"""eBay listing extractor.

eBay puts useful structured data in two places: JSON-LD `<script>` blocks
(title, brand, image set, category) and a 'Item specifics' table that holds
size, country of origin, fabric content, and sometimes measurements.
"""

from __future__ import annotations

import json
from typing import Any

from pydantic import HttpUrl
from selectolax.parser import HTMLParser

from ..schemas import Confidence, GarmentType, Marketplace, Signal, SourceGarment
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


def _parse_item_specifics(tree: HTMLParser) -> dict[str, str]:
    """Pull eBay's 'Item specifics' (or 'About this item') key/value pairs."""
    specs: dict[str, str] = {}
    # eBay markup has shifted across redesigns — try a few selectors.
    pairs = tree.css(
        ".ux-labels-values, dl.ux-labels-values, "
        "div[data-testid='ux-labels-values'], div.itemAttr table tr"
    )
    for pair in pairs:
        label_node = pair.css_first(
            ".ux-labels-values__labels-content, .attrLabels, dt, th"
        )
        value_node = pair.css_first(
            ".ux-labels-values__values-content, .attrValue, dd, td"
        )
        if label_node and value_node:
            label = label_node.text(strip=True).rstrip(":").lower()
            value = value_node.text(strip=True)
            if label and value:
                specs[label] = value
    return specs


def extract(*, url: str, html: str, marketplace: Marketplace) -> SourceGarment:
    tree = HTMLParser(html)
    og = parse_og_meta(tree)
    title = og.title
    description = og.description

    brand_value: str | None = None
    size_value: str | None = None
    photo_urls: list[str] = list(og.image_urls or [])

    for blob in _iter_jsonld(tree):
        if blob.get("@type") in {"Product", "ItemList"}:
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
            break

    specs = _parse_item_specifics(tree)
    brand_value = brand_value or specs.get("brand")
    size_value = specs.get("size") or specs.get("size (men's)") or specs.get("size type")
    country = specs.get("country/region of manufacture") or specs.get("country of manufacture")
    fabric = specs.get("material")

    # eBay sellers sometimes drop measurements in description OR in a custom
    # "measurements" item specific.
    measurements_text = " ".join(
        v for k, v in specs.items() if "measurement" in k or "length" in k or "chest" in k
    )
    measurements = parse_measurements(measurements_text) or parse_measurements(description)

    brand_signal = (
        Signal(value=brand_value, confidence=Confidence.high, source="ebay:jsonld.brand")
        if brand_value
        else None
    )
    size_signal = (
        Signal(value=size_value, confidence=Confidence.high, source="ebay:item-specifics.size")
        if size_value
        else None
    )
    country_signal = (
        Signal(value=country, confidence=Confidence.high, source="ebay:item-specifics.country")
        if country
        else None
    )
    fabric_signal = (
        Signal(value=fabric, confidence=Confidence.medium, source="ebay:item-specifics.material")
        if fabric
        else None
    )

    return SourceGarment(
        source_kind="url",
        source_url=HttpUrl(url),
        marketplace=marketplace,
        title=title,
        description=description,
        photo_urls=[HttpUrl(u) for u in dict.fromkeys(photo_urls)],
        brand=brand_signal,
        size=size_signal,
        country_of_origin=country_signal,
        fabric_content=fabric_signal,
        raw_seller_size_label=size_value,
        measurements=measurements,
    )
