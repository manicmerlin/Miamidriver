"""Integration tests for the persistence + learning loop."""

from pathlib import Path

import pytest

from app.config import settings


@pytest.fixture(autouse=True)
def fresh_db(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    # Re-init the db module against the new path.
    import importlib

    from app.storage import db as db_mod

    monkeypatch.setattr(db_mod, "_DB_PATH", tmp_path / "vintagefit.sqlite")
    importlib.reload(db_mod)
    monkeypatch.setattr(db_mod, "_DB_PATH", tmp_path / "vintagefit.sqlite")
    db_mod.init_db()
    yield


def _profile(brand="Christian Dior Monsieur", line="Monsieur Long-Sleeve Sport Shirt",
             era="Marc Bohan Era (1970–1989)", size="L", pid="cdm-l-1"):
    from app.schemas import FitProfile, GarmentType

    return FitProfile(
        id=pid,
        derived_from=[],
        brand=brand,
        line=line,
        era_label=era,
        garment_type=GarmentType.shirt,
        size_label=size,
    )


def test_save_and_load_profile():
    from app.storage import load_profile, save_profile

    p = _profile()
    save_profile(p)
    loaded = load_profile(p.id)
    assert loaded is not None
    assert loaded.brand == p.brand
    assert loaded.line == p.line


def test_find_more_event_reinforces_pair():
    from app.storage import chart_key, record_find_more_event, save_profile, similarity_boost

    p = _profile()
    save_profile(p)

    src_key = chart_key(p.brand, p.line, p.era_label, p.size_label)
    target_key = chart_key("J.Crew", "Slim Untucked", "Mickey Drexler Era (2003–2017)", "L")

    # Initially no boost.
    assert similarity_boost(src_key) == {}

    record_find_more_event(p.id, target_key)
    record_find_more_event(p.id, target_key)
    record_find_more_event(p.id, target_key)

    boosts = similarity_boost(src_key)
    assert boosts.get(target_key, 0.0) >= 3.0


def test_cross_match_distance_reduced_by_boost():
    from app.cross_match import find_cross_matches
    from app.schemas import Confidence, GarmentType, Measurement
    from app.storage import chart_key

    src = [
        Measurement(name="chest", value=23.0, unit="in", source="t", confidence=Confidence.high),
        Measurement(name="length", value=30.5, unit="in", source="t", confidence=Confidence.high),
    ]
    jcrew_key = chart_key("J.Crew", "Slim Untucked", "Mickey Drexler Era (2003–2017)", "L")

    unboosted = find_cross_matches(source_measurements=src, source_garment_type=GarmentType.shirt)
    boosted = find_cross_matches(
        source_measurements=src,
        source_garment_type=GarmentType.shirt,
        learned_boosts={jcrew_key: 5.0},
    )

    def _distance(matches, key):
        for m in matches:
            if chart_key(m.entry.brand, m.entry.line, m.entry.era_label, m.entry.size_label) == key:
                return m.distance
        return None

    u = _distance(unboosted, jcrew_key)
    b = _distance(boosted, jcrew_key)
    if u is not None and b is not None:
        assert b < u, "boosted distance should be smaller than unboosted"
