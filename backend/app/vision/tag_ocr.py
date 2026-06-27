"""Tag-image OCR + brand classification.

Why one model, not OCR-then-LLM: real-world tags are wrinkled, tilted, and
partially obscured. A pure OCR pass loses brand context ('CHRISTIAN DIOR
MONSIEUR' vs 'CHRISTIAN DIOR' is a meaningful distinction). A vision LLM
can read AND reason about layout in one call.

Returns a `SourceGarment` with `source_kind='tag_image'` and whichever
fields it could fill in. Caller is responsible for merging with anything
the URL extractor already pulled.
"""

from __future__ import annotations

import base64
import json
import re
from typing import Any

from ..config import settings
from ..schemas import Confidence, GarmentType, Marketplace, Signal, SourceGarment


_PROMPT = """You are extracting structured data from a photo of a clothing tag.

Return ONLY a JSON object with these keys (use null if unknown):
{
  "brand": "canonical brand name as printed",
  "line": "sub-line / collection if visible (e.g. 'Slim Untucked', 'Monsieur')",
  "size": "size as printed (e.g. 'L', '32x32', 'M Tall')",
  "country_of_origin": "as printed (e.g. 'Mauritius', 'Italy')",
  "fabric_content": "as printed (e.g. '100% cotton', '60% wool 40% poly')",
  "garment_type": "one of: shirt, polo, tshirt, sweater, jacket, coat, pants, shorts, suit, blazer, unknown",
  "era_hint": "rough year/decade if the tag style suggests one (e.g. 'late 1990s', '2015-2020', null if uncertain)",
  "ocr_text": "raw text you read off the tag, line-broken",
  "confidence": "high | medium | low overall"
}

Do not invent fields. Do not wrap the JSON in markdown. Just the JSON object.
"""


def _stub_result() -> SourceGarment:
    return SourceGarment(source_kind="tag_image", marketplace=Marketplace.unknown)


async def classify_tag_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> SourceGarment:
    provider = settings.vision_provider.lower()
    if provider == "anthropic" and settings.anthropic_api_key:
        return await _classify_with_anthropic(image_bytes, mime_type)
    return _stub_result()


async def _classify_with_anthropic(image_bytes: bytes, mime_type: str) -> SourceGarment:
    # Imported lazily so the stub path doesn't require the SDK at import time.
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    b64 = base64.b64encode(image_bytes).decode("ascii")

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": b64,
                        },
                    },
                    {"type": "text", "text": _PROMPT},
                ],
            }
        ],
    )

    text = "".join(block.text for block in response.content if getattr(block, "type", "") == "text")
    parsed = _parse_json_loose(text)
    if not parsed:
        return _stub_result()

    overall_conf = _confidence_from(parsed.get("confidence"))

    def _sig(key: str, source: str) -> Signal | None:
        value = parsed.get(key)
        if isinstance(value, str) and value.strip():
            return Signal(value=value.strip(), confidence=overall_conf, source=source)
        return None

    garment_type = GarmentType.unknown
    raw_type = parsed.get("garment_type")
    if isinstance(raw_type, str):
        try:
            garment_type = GarmentType(raw_type.strip().lower())
        except ValueError:
            garment_type = GarmentType.unknown

    description = parsed.get("ocr_text") if isinstance(parsed.get("ocr_text"), str) else None

    return SourceGarment(
        source_kind="tag_image",
        marketplace=Marketplace.unknown,
        description=description,
        brand=_sig("brand", "tag-ocr:anthropic"),
        line=_sig("line", "tag-ocr:anthropic"),
        garment_type=garment_type,
        size=_sig("size", "tag-ocr:anthropic"),
        country_of_origin=_sig("country_of_origin", "tag-ocr:anthropic"),
        fabric_content=_sig("fabric_content", "tag-ocr:anthropic"),
        era_hint=_sig("era_hint", "tag-ocr:anthropic"),
        raw_seller_size_label=(parsed.get("size") if isinstance(parsed.get("size"), str) else None),
    )


def _parse_json_loose(text: str) -> dict[str, Any] | None:
    """Vision models occasionally wrap JSON in prose or fences. Strip and parse."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Last resort: find the first {...} block.
    match = re.search(r"\{.*\}", text, re.S)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


def _confidence_from(value: Any) -> Confidence:
    if isinstance(value, str):
        v = value.strip().lower()
        if v in {"high", "medium", "low"}:
            return Confidence(v)
    return Confidence.medium
