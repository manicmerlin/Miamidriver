"""Runtime web-research for canonical sizing.

Uses Anthropic's web_search tool: the model picks queries, reads pages, and
returns structured measurements + URL citations. Server-side this routes
through Anthropic's infrastructure rather than direct origin fetches, so
401/403 blocks from marketplaces are not the constraint we hit locally.

Output is a `SizeChartEntry` tagged `researched` with citations. We do NOT
auto-write the result back to the YAML KB from request-handling code —
that's a curator's job, to keep the on-disk KB stable. The caller can
persist if it wants.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from ..config import settings
from ..schemas import (
    Confidence,
    GarmentType,
    Measurement,
    SizeChartEntry,
    SizeChartTier,
)


log = logging.getLogger(__name__)


_PROMPT = """You are researching canonical flat-laid measurements for a specific vintage / brand garment.

Target:
  brand: {brand}
  line / sub-line: {line}
  era / collection: {era_label}
  garment type: {garment_type}
  size: {size_label}

Your job:
1. Use web_search to find ACTUAL measurements from authoritative sources, in priority order:
   - Brand's own historical size guide (web.archive.org snapshots of brand sizing pages welcome)
   - Reputable sizing-comparison sites (e.g. shirtdetective.com, askandyaboutclothes.com)
   - A sample of completed Grailed / eBay / Depop listings with seller-stated flat-lay measurements for this exact (brand, line, era, size)
   - Reddit threads (r/malefashionadvice, r/grailedgrails, r/vintage) discussing this brand
2. Convert everything to PIT-TO-PIT (half-chest), garment flat, in INCHES. If a source quotes full chest circumference, divide by 2.
3. Report the measurements that you found with confidence. Do NOT invent any value. If you cannot find a measurement for a dimension, omit it.
4. Return ONLY a JSON object with this shape:
{{
  "measurements": {{
    "chest": <pit-to-pit inches, e.g. 23.0>,
    "length": <back length inches>,
    "shoulder": <shoulder-seam-to-shoulder-seam inches>,
    "sleeve": <sleeve length inches, from shoulder seam>
  }},
  "citations": ["url1", "url2", ...],
  "notes": "short explanation of how you derived the values",
  "confidence": "high" | "medium" | "low"
}}

Omit any measurement key you can't substantiate. No markdown, just the JSON object.
"""


async def research_size_chart(
    *,
    brand: str,
    line: str | None,
    era_label: str | None,
    garment_type: GarmentType,
    size_label: str,
) -> SizeChartEntry | None:
    provider = settings.vision_provider.lower()  # reuse the same flag; both use Anthropic
    if provider != "anthropic" or not settings.anthropic_api_key:
        log.info("research disabled (provider=%s)", provider)
        return None

    try:
        return await _research_with_anthropic(
            brand=brand,
            line=line,
            era_label=era_label,
            garment_type=garment_type,
            size_label=size_label,
        )
    except Exception as exc:  # noqa: BLE001 — opportunistic, never crash ingest
        log.warning("research_size_chart failed: %s", exc)
        return None


async def _research_with_anthropic(
    *,
    brand: str,
    line: str | None,
    era_label: str | None,
    garment_type: GarmentType,
    size_label: str,
) -> SizeChartEntry | None:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    prompt = _PROMPT.format(
        brand=brand,
        line=line or "(unknown line)",
        era_label=era_label or "(unknown era)",
        garment_type=garment_type.value,
        size_label=size_label,
    )

    # web_search is exposed as a server-tool: max_uses caps the number of
    # searches per request to keep costs bounded.
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 6}],
        messages=[{"role": "user", "content": prompt}],
    )

    # The model emits text blocks interleaved with tool-use / tool-result.
    # We only care about the final text block.
    text = "".join(b.text for b in response.content if getattr(b, "type", "") == "text")
    parsed = _parse_json_loose(text)
    if not parsed:
        log.info("research returned no parseable JSON")
        return None

    raw_measurements = parsed.get("measurements") or {}
    if not isinstance(raw_measurements, dict) or not raw_measurements:
        return None

    confidence = _confidence_from(parsed.get("confidence"))
    measurements: list[Measurement] = []
    for name, value in raw_measurements.items():
        try:
            v = float(value)
        except (TypeError, ValueError):
            continue
        if not 1 < v < 80:
            continue
        if name not in {
            "chest",
            "length",
            "shoulder",
            "sleeve",
            "waist",
            "hip",
            "rise",
            "inseam",
            "thigh",
            "neck",
            "bicep",
            "hem",
        }:
            continue
        measurements.append(
            Measurement(
                name=name,  # type: ignore[arg-type]
                value=v,
                unit="in",
                source="research:web_search",
                confidence=confidence,
            )
        )

    if not measurements:
        return None

    citations = [
        c for c in (parsed.get("citations") or []) if isinstance(c, str) and c.strip()
    ]
    notes = parsed.get("notes") if isinstance(parsed.get("notes"), str) else None

    return SizeChartEntry(
        brand=brand,
        line=line or "Unknown line",
        era_label=era_label or "Unknown era",
        garment_type=garment_type,
        size_label=size_label,
        measurements=measurements,
        source="research:web_search",
        tier=SizeChartTier.researched,
        citations=citations,
        notes=notes,
    )


def _confidence_from(value: Any) -> Confidence:
    if isinstance(value, str):
        v = value.strip().lower()
        if v in {"high", "medium", "low"}:
            return Confidence(v)
    return Confidence.medium


def _parse_json_loose(text: str) -> dict[str, Any] | None:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.S)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None
