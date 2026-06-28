"""Cross-collection match engine.

Given a set of canonical measurements (chest/length/shoulder/sleeve), find
other (brand, line, era, size) combos from the sizing KB whose canonical
measurements are within tolerance. Rank by normalized distance.

We DO NOT cross-match against the source garment's own (brand, line, era, size)
combo — that's not a "find me more like this" result, that's the input.
"""

from __future__ import annotations

from ..schemas import CrossMatchCandidate, GarmentType, Measurement, SizeChartEntry
from ..sizing import all_charts
from ..storage import chart_key


# Per-measurement tolerance in inches. A measurement outside tolerance is a
# hard rejection regardless of how well other measurements match.
_TOLERANCE_INCHES = {
    "chest": 1.25,
    "length": 1.5,
    "shoulder": 1.0,
    "sleeve": 1.25,
    "waist": 1.5,
    "hip": 1.5,
    "inseam": 1.5,
    "rise": 1.0,
}


def _to_inches(m: Measurement) -> float:
    return m.value if m.unit == "in" else m.value / 2.54


def _by_name(measurements: list[Measurement]) -> dict[str, float]:
    out: dict[str, float] = {}
    for m in measurements:
        # Keep the first (highest-confidence) value per name.
        if m.name not in out:
            out[m.name] = _to_inches(m)
    return out


def _is_same_garment_class(a: GarmentType, b: GarmentType) -> bool:
    if a == b:
        return True
    # 'shirt' and 'polo' aren't cross-fitting; 'jacket' and 'blazer' are close.
    pairs = {(GarmentType.jacket, GarmentType.blazer)}
    return (a, b) in pairs or (b, a) in pairs


def find_cross_matches(
    *,
    source_measurements: list[Measurement],
    source_garment_type: GarmentType,
    exclude: tuple[str, str, str, str] | None = None,
    limit: int = 8,
    learned_boosts: dict[str, float] | None = None,
) -> list[CrossMatchCandidate]:
    """Find size-chart entries with measurements close to `source_measurements`.

    `exclude` is the (brand, line, era_label, size_label) of the source garment
    so we don't suggest it back to the user.

    `learned_boosts` maps a target chart_key to a non-negative bonus weight;
    candidates with a positive boost have their normalized distance reduced
    so the user-reinforced pairs surface first.
    """
    src = _by_name(source_measurements)
    if not src:
        return []

    candidates: list[CrossMatchCandidate] = []

    for entry in all_charts():
        if exclude is not None:
            if (
                entry.brand.lower() == exclude[0].lower()
                and entry.line.lower() == exclude[1].lower()
                and entry.era_label.lower() == exclude[2].lower()
                and entry.size_label.lower() == exclude[3].lower()
            ):
                continue
        if not _is_same_garment_class(entry.garment_type, source_garment_type):
            continue

        cand = _by_name(entry.measurements)
        # Only compare measurements both sides have.
        common = [n for n in src if n in cand]
        if not common:
            continue

        # Hard reject if ANY common measurement exceeds its tolerance.
        rejected = False
        deltas: dict[str, float] = {}
        total_norm = 0.0
        for name in common:
            diff = cand[name] - src[name]
            deltas[name] = round(diff, 2)
            tol = _TOLERANCE_INCHES.get(name, 1.0)
            if abs(diff) > tol:
                rejected = True
                break
            # Normalize by tolerance — a 1" miss on chest weights the same as
            # a 1.5" miss on length.
            total_norm += abs(diff) / tol
        if rejected:
            continue

        distance = round(total_norm / len(common), 3)

        if learned_boosts:
            target_key = chart_key(entry.brand, entry.line, entry.era_label, entry.size_label)
            boost = learned_boosts.get(target_key, 0.0)
            if boost:
                # Each reinforcement subtracts 0.05 from normalized distance,
                # capped at 0.5 to keep dimensions meaningful.
                distance = round(max(0.0, distance - min(0.5, 0.05 * boost)), 3)

        candidates.append(
            CrossMatchCandidate(
                entry=entry,
                distance=distance,
                matched_measurements=common,
                delta_inches=deltas,
            )
        )

    candidates.sort(key=lambda c: c.distance)
    return candidates[:limit]
