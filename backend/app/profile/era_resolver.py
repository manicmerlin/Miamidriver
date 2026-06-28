"""Resolve the most likely era_label from tag markers + photo signals + KB.

Each era in the brand KB has `tag_markers` (e.g. "Made in Mauritius") and a
year range. We score each era by:

1. Tag-marker hits — the listing's country-of-origin or tag text contains a marker
2. Photo-vision signals — the vision model returned an `EraInferenceSignal`
   that names this era
3. Era hint from tag OCR — verbatim user / model-supplied year string

Highest total weight wins. Confidence is graded from the score delta over
the runner-up.
"""

from __future__ import annotations

from ..schemas import (
    BrandRecord,
    Confidence,
    EraInference,
    EraInferenceSignal,
    SourceGarment,
)


def resolve_era(
    source: SourceGarment,
    brand_record: BrandRecord | None,
    extra_signals: list[EraInferenceSignal] | None = None,
) -> EraInference:
    signals: list[EraInferenceSignal] = list(extra_signals or [])

    if brand_record and brand_record.eras:
        country = source.country_of_origin.value.lower() if source.country_of_origin else ""
        haystack = " ".join(
            filter(
                None,
                [
                    source.title,
                    source.description,
                    source.line.value if source.line else None,
                    source.raw_seller_size_label,
                ],
            )
        ).lower()
        for era in brand_record.eras:
            for marker in era.tag_markers:
                m = marker.lower()
                # Tag markers are typically full strings like "Made in France";
                # the country signal is just "France". Match either direction.
                if country and (country in m or m in country):
                    signals.append(
                        EraInferenceSignal(
                            label_pushed=era.label,
                            observation=f"Country of origin matches '{marker}'",
                            weight=2.5,
                            source="tag-marker:country",
                        )
                    )
                elif m and m in haystack:
                    signals.append(
                        EraInferenceSignal(
                            label_pushed=era.label,
                            observation=f"Title/description contains '{marker}'",
                            weight=1.5,
                            source="tag-marker:text",
                        )
                    )

    if source.era_hint:
        # Use the OCR/AI hint as a moderate-weight signal toward any era whose
        # year range overlaps with the hint, when we can parse a year.
        hint = source.era_hint.value
        year = _first_year_in(hint)
        if year and brand_record:
            for era in brand_record.eras:
                if era.years and era.years[0] <= year <= era.years[1]:
                    signals.append(
                        EraInferenceSignal(
                            label_pushed=era.label,
                            observation=f"OCR era hint '{hint}' falls in this era's year range",
                            weight=1.5,
                            source="tag-ocr:era-hint",
                        )
                    )
        elif hint and not brand_record:
            return EraInference(
                chosen_era_label=hint,
                confidence=Confidence.low,
                signals=[
                    EraInferenceSignal(
                        label_pushed=hint,
                        observation=f"OCR era hint '{hint}'",
                        weight=1.0,
                        source="tag-ocr:era-hint",
                    )
                ],
            )

    if not signals:
        return EraInference()

    scores: dict[str, float] = {}
    for s in signals:
        scores[s.label_pushed] = scores.get(s.label_pushed, 0.0) + s.weight
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    top_label, top_score = ranked[0]
    runner_up = ranked[1][1] if len(ranked) > 1 else 0.0

    if top_score >= 3.5 and (top_score - runner_up) >= 2.0:
        confidence = Confidence.high
    elif top_score >= 2.0:
        confidence = Confidence.medium
    else:
        confidence = Confidence.low

    return EraInference(
        chosen_era_label=top_label,
        confidence=confidence,
        signals=signals,
        alternates=[label for label, _ in ranked[1:4]],
    )


def _first_year_in(text: str) -> int | None:
    import re

    m = re.search(r"\b(19[5-9]\d|20[0-2]\d)\b", text)
    return int(m.group(1)) if m else None
