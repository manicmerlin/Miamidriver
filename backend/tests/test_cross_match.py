from app.cross_match import find_cross_matches
from app.schemas import Confidence, GarmentType, Measurement


def _meas(name: str, value: float) -> Measurement:
    return Measurement(name=name, value=value, unit="in", source="test", confidence=Confidence.high)


def test_dior_l_finds_jcrew_l_within_tolerance():
    # Dior Monsieur L (Bohan): chest 23.5, length 30.5, shoulder 19.5, sleeve 25.0
    src = [
        _meas("chest", 23.5),
        _meas("length", 30.5),
        _meas("shoulder", 19.5),
        _meas("sleeve", 25.0),
    ]
    matches = find_cross_matches(
        source_measurements=src,
        source_garment_type=GarmentType.shirt,
        exclude=("Christian Dior Monsieur", "Monsieur Sport Shirt", "Marc Bohan Era (1970–1989)", "L"),
    )
    assert matches, "expected at least one cross-match"
    keys = {(m.entry.brand, m.entry.size_label) for m in matches}
    # J.Crew Slim Untucked L chest 23.0 length 29.0 — well within tolerance.
    assert ("J.Crew", "L") in keys


def test_excludes_source_garment_itself():
    src = [_meas("chest", 23.5), _meas("length", 30.5)]
    matches = find_cross_matches(
        source_measurements=src,
        source_garment_type=GarmentType.shirt,
        exclude=("Christian Dior Monsieur", "Monsieur Sport Shirt", "Marc Bohan Era (1970–1989)", "L"),
    )
    # The exclude covers the exact (brand, line, era, size); a same-brand
    # match in a DIFFERENT era is still a legitimate cross-match.
    for m in matches:
        assert not (
            m.entry.brand == "Christian Dior Monsieur"
            and m.entry.line == "Monsieur Sport Shirt"
            and m.entry.era_label == "Marc Bohan Era (1970–1989)"
            and m.entry.size_label == "L"
        )


def test_no_matches_when_far_off():
    # Way too small to match anything in the KB.
    src = [_meas("chest", 12.0), _meas("length", 18.0)]
    matches = find_cross_matches(
        source_measurements=src,
        source_garment_type=GarmentType.shirt,
    )
    assert matches == []


def test_ranks_closer_above_farther():
    # Dior Monsieur L Bohan exactly
    src = [_meas("chest", 23.5), _meas("length", 30.5), _meas("shoulder", 19.5)]
    matches = find_cross_matches(
        source_measurements=src,
        source_garment_type=GarmentType.shirt,
        exclude=("Christian Dior Monsieur", "Monsieur Sport Shirt", "Marc Bohan Era (1970–1989)", "L"),
        limit=8,
    )
    # The list is sorted by distance ascending.
    assert matches == sorted(matches, key=lambda m: m.distance)
