"""Assemble a FitProfile from one or more SourceGarments + brand KB lookup.

The builder is intentionally lossy: a SourceGarment may have signals with
varying confidence and source tags; the FitProfile keeps only the resolved
best-guess for each field. We do not invent values — if no signal exists for a
field, the profile leaves it None.

Era resolution: if the brand KB has eras and the source garment has a country
of origin or tag marker that uniquely identifies one, the era_label is filled
from the KB. Otherwise era_hint from tag-OCR (if any) is used verbatim.
"""

from __future__ import annotations

import hashlib
from typing import Iterable

from ..brands import lookup_brand
from ..schemas import (
    BrandRecord,
    EraInferenceSignal,
    FitProfile,
    GarmentType,
    SourceGarment,
)
from .era_resolver import resolve_era


def _profile_id(sources: Iterable[SourceGarment]) -> str:
    h = hashlib.sha256()
    for s in sources:
        if s.source_url:
            h.update(str(s.source_url).encode())
        if s.brand:
            h.update(s.brand.value.encode())
        if s.raw_seller_size_label:
            h.update(s.raw_seller_size_label.encode())
    return h.hexdigest()[:12]


def _resolve_line(source: SourceGarment, brand: BrandRecord | None) -> str | None:
    if source.line:
        return source.line.value
    if not brand:
        return None
    haystack = " ".join(
        filter(
            None,
            [
                source.title,
                source.description,
                source.raw_seller_size_label,
                source.size.value if source.size else None,
            ],
        )
    ).lower()
    for line in brand.common_lines:
        if line.lower() in haystack:
            return line
    return None


def build_fit_profile(
    sources: list[SourceGarment],
    extra_era_signals: list[EraInferenceSignal] | None = None,
) -> FitProfile:
    if not sources:
        raise ValueError("build_fit_profile requires at least one source garment")

    primary = sources[0]
    brand_name = primary.brand.value if primary.brand else None
    brand_record = lookup_brand(brand_name)

    canonical_brand = brand_record.canonical_name if brand_record else brand_name

    line = _resolve_line(primary, brand_record)
    era = resolve_era(primary, brand_record, extra_era_signals).chosen_era_label

    garment_type = primary.garment_type if primary.garment_type != GarmentType.unknown else GarmentType.unknown
    for s in sources[1:]:
        if garment_type == GarmentType.unknown and s.garment_type != GarmentType.unknown:
            garment_type = s.garment_type

    # Measurements: take the highest-confidence value per name across all sources.
    best: dict[str, tuple[int, object]] = {}
    rank = {"high": 3, "medium": 2, "low": 1}
    for s in sources:
        for m in s.measurements:
            score = rank.get(m.confidence.value, 0)
            if m.name not in best or score > best[m.name][0]:
                best[m.name] = (score, m)
    measurements = [m for _, m in best.values()]  # type: ignore[assignment]

    derived_from: list[str] = []
    for s in sources:
        if s.source_url:
            derived_from.append(str(s.source_url))
        elif s.source_kind == "tag_image":
            derived_from.append("tag-image")

    return FitProfile(
        id=_profile_id(sources),
        derived_from=derived_from,
        brand=canonical_brand,
        line=line,
        era_label=era,
        garment_type=garment_type,
        size_label=primary.size.value if primary.size else primary.raw_seller_size_label,
        country_of_origin=(
            primary.country_of_origin.value if primary.country_of_origin else None
        ),
        fabric_content=primary.fabric_content.value if primary.fabric_content else None,
        measurements=measurements,
    )
