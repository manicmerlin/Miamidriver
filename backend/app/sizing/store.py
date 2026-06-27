"""Curated size-chart store.

Each YAML file is a list of charts for one brand. A chart is (line, era_label,
garment_type, source, notes, sizes) where `sizes` is `size_label → {measurement: value-inches}`.

We deliberately don't try to interpolate or auto-derive charts — provenance
matters more than coverage. A row without a curated chart simply returns no
canonical measurements; UI shows "seller-stated only" rather than fabricating
numbers.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml

from ..schemas import Confidence, GarmentType, Measurement, SizeChartEntry, SizeChartTier


_DATA_DIR = Path(__file__).parent / "data"


@lru_cache(maxsize=1)
def _load_all() -> list[SizeChartEntry]:
    entries: list[SizeChartEntry] = []
    for path in sorted(_DATA_DIR.glob("*.yaml")):
        with path.open() as f:
            payload = yaml.safe_load(f)
        if not payload:
            continue
        brand = payload["brand"]
        for chart in payload.get("charts", []):
            line = chart["line"]
            era = chart["era_label"]
            garment_type = GarmentType(chart.get("garment_type", "unknown"))
            source = chart.get("source", "curated:unknown")
            notes = chart.get("notes")
            tier = SizeChartTier(chart.get("tier", "estimated"))
            citations = list(chart.get("citations") or [])
            # Researched values get high confidence; estimated values get
            # low, so the cross-match engine doesn't pretend they're trustworthy.
            value_confidence = (
                Confidence.high if tier == SizeChartTier.researched else Confidence.low
            )
            for size_label, dims in chart.get("sizes", {}).items():
                measurements = [
                    Measurement(
                        name=name,  # type: ignore[arg-type]
                        value=float(value),
                        unit="in",
                        source=f"size-chart:{source}",
                        confidence=value_confidence,
                    )
                    for name, value in dims.items()
                ]
                entries.append(
                    SizeChartEntry(
                        brand=brand,
                        line=line,
                        era_label=era,
                        garment_type=garment_type,
                        size_label=str(size_label),
                        measurements=measurements,
                        source=source,
                        tier=tier,
                        citations=citations,
                        notes=notes,
                    )
                )
    return entries


def all_charts() -> list[SizeChartEntry]:
    return list(_load_all())


def lookup_size_chart(
    *,
    brand: str | None,
    line: str | None,
    era_label: str | None,
    garment_type: GarmentType | None,
    size_label: str | None,
) -> SizeChartEntry | None:
    if not brand or not size_label:
        return None
    needle_brand = brand.strip().lower()
    needle_size = size_label.strip().lower()

    def score(entry: SizeChartEntry) -> int:
        s = 0
        if entry.brand.lower() == needle_brand:
            s += 10
        elif needle_brand in entry.brand.lower():
            s += 5
        if line and entry.line.lower() == line.lower():
            s += 4
        elif line and line.lower() in entry.line.lower():
            s += 2
        if era_label and entry.era_label.lower() == era_label.lower():
            s += 3
        elif era_label and entry.era_label.lower().split(" (")[0] == era_label.lower().split(" (")[0]:
            s += 2
        if garment_type and entry.garment_type == garment_type:
            s += 2
        if entry.size_label.lower() == needle_size:
            s += 5
        return s

    candidates = [(score(e), e) for e in _load_all()]
    candidates = [(s, e) for s, e in candidates if s >= 15]  # brand + size required
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def canonical_measurements(entry: SizeChartEntry | None) -> list[Measurement]:
    return list(entry.measurements) if entry else []
