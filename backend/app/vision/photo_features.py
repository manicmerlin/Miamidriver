"""Photo-feature extraction for era inference.

Given a list of listing photo URLs (or the tag photo itself), call a vision
model to extract era-corroborating observations:

- collar style (button-down, point, spread, club, camp, banded)
- button style (mother-of-pearl, plastic, horn, contrast)
- fabric pattern (madras plaid, tartan, gingham, oxford solid, chambray)
- fit silhouette (boxy / classic / slim / cropped)
- label aging (sun-faded, crisp, peeling) — a soft signal for vintage age

Returns a `PhotoFeatures` plus a list of `EraInferenceSignal`s the caller can
fold into the era resolver.
"""

from __future__ import annotations

import base64
import io
import json
import re
from typing import Any

import httpx

from ..config import settings
from ..schemas import (
    Confidence,
    EraInferenceSignal,
    PhotoFeatures,
)


_PROMPT = """You are inspecting clothing-listing photos to estimate the
garment's likely era and corroborate brand/collection. Look at:

- Collar shape (long point = 70s, narrow point = 80s, button-down = preppy/Americana, camp = pre-70s or revival)
- Button material (mother-of-pearl = higher tier, horn = often Italian/British 70s-90s, plain plastic = modern budget)
- Fabric pattern (madras plaid, tartan, gingham, herringbone, oxford solid, chambray)
- Garment silhouette as worn or laid flat (boxy/classic/slim/cropped)
- Brand label condition if visible (sun-faded color, peeling, crisp/modern)

Return ONLY a JSON object with these keys (null if unknown):
{
  "collar_style": "...",
  "button_style": "...",
  "fabric_pattern": "...",
  "fit_silhouette": "...",
  "label_aging": "...",
  "era_signals": [
    {"observation": "...", "supports_era_label": "e.g. 'Marc Bohan Era (1970–1989)'", "weight": 0.0-3.0}
  ],
  "notes": ["short free-text observations"]
}

Do not wrap in markdown. Just the JSON.
"""


async def analyze_photos(
    photo_urls: list[str], brand_hint: str | None = None
) -> tuple[PhotoFeatures, list[EraInferenceSignal]]:
    if not photo_urls:
        return PhotoFeatures(), []
    provider = settings.vision_provider.lower()
    if provider == "anthropic" and settings.anthropic_api_key:
        try:
            return await _analyze_with_anthropic(photo_urls, brand_hint)
        except Exception:  # graceful fallback — vision is opportunistic
            return PhotoFeatures(), []
    return PhotoFeatures(), []


async def _fetch_image(url: str) -> tuple[bytes, str] | None:
    try:
        async with httpx.AsyncClient(
            timeout=settings.fetch_timeout_seconds,
            follow_redirects=True,
            headers={"User-Agent": settings.user_agent},
        ) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.content, r.headers.get("content-type", "image/jpeg").split(";")[0]
    except Exception:
        return None


async def _analyze_with_anthropic(
    photo_urls: list[str], brand_hint: str | None
) -> tuple[PhotoFeatures, list[EraInferenceSignal]]:
    from anthropic import AsyncAnthropic

    # Cap at 4 photos to keep the request payload sane.
    images: list[tuple[bytes, str]] = []
    for url in photo_urls[:4]:
        result = await _fetch_image(url)
        if result:
            images.append(result)
    if not images:
        return PhotoFeatures(), []

    content: list[dict[str, Any]] = []
    for data, mime in images:
        content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime if mime.startswith("image/") else "image/jpeg",
                    "data": base64.b64encode(data).decode("ascii"),
                },
            }
        )
    prompt = _PROMPT
    if brand_hint:
        prompt = f"Brand context (from tag/listing): {brand_hint}\n\n{prompt}"
    content.append({"type": "text", "text": prompt})

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        messages=[{"role": "user", "content": content}],
    )

    text = "".join(b.text for b in response.content if getattr(b, "type", "") == "text")
    parsed = _parse_json_loose(text)
    if not parsed:
        return PhotoFeatures(raw_response=text), []

    features = PhotoFeatures(
        collar_style=_str_or_none(parsed.get("collar_style")),
        button_style=_str_or_none(parsed.get("button_style")),
        fabric_pattern=_str_or_none(parsed.get("fabric_pattern")),
        fit_silhouette=_str_or_none(parsed.get("fit_silhouette")),
        label_aging=_str_or_none(parsed.get("label_aging")),
        additional_notes=[s for s in (parsed.get("notes") or []) if isinstance(s, str)],
        raw_response=text,
    )

    signals: list[EraInferenceSignal] = []
    for raw in parsed.get("era_signals") or []:
        if not isinstance(raw, dict):
            continue
        label = raw.get("supports_era_label")
        obs = raw.get("observation")
        if not isinstance(label, str) or not isinstance(obs, str):
            continue
        try:
            weight = float(raw.get("weight", 1.0))
        except (TypeError, ValueError):
            weight = 1.0
        signals.append(
            EraInferenceSignal(
                label_pushed=label,
                observation=obs,
                weight=max(0.0, min(5.0, weight)),
                source="photo-vision:anthropic",
            )
        )
    return features, signals


def _str_or_none(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


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


# kept for typing / future expansion
__all__ = ["analyze_photos", "io"]
