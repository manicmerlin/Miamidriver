from app.brands import lookup_brand
from app.profile import resolve_era
from app.schemas import (
    Confidence,
    EraInferenceSignal,
    GarmentType,
    Marketplace,
    Signal,
    SourceGarment,
)


def _dior_source(country: str = "France", title: str = "vintage Dior Monsieur plaid") -> SourceGarment:
    return SourceGarment(
        source_kind="url",
        marketplace=Marketplace.depop,
        title=title,
        brand=Signal(value="Christian Dior Monsieur", confidence=Confidence.high, source="tag-ocr"),
        country_of_origin=Signal(value=country, confidence=Confidence.high, source="tag-ocr"),
        garment_type=GarmentType.shirt,
    )


def test_bohan_era_from_france_country_marker():
    rec = lookup_brand("Christian Dior Monsieur")
    inference = resolve_era(_dior_source(country="France"), rec, [])
    assert inference.chosen_era_label is not None
    assert "Bohan" in inference.chosen_era_label or "Ferré" in inference.chosen_era_label


def test_photo_signal_breaks_tie_toward_ferre():
    rec = lookup_brand("Christian Dior Monsieur")
    # France marker matches both Bohan and Ferré eras (both list "Made in France"
    # or "Italy"). A strong photo signal for Ferré should pull the resolution.
    photo_signals = [
        EraInferenceSignal(
            label_pushed="Gianfranco Ferré Era (1989–1996)",
            observation="Broader shoulder cut typical of Ferré",
            weight=3.0,
            source="photo-vision:test",
        ),
        EraInferenceSignal(
            label_pushed="Gianfranco Ferré Era (1989–1996)",
            observation="Heavier wool fabric typical of late-80s Ferré",
            weight=2.5,
            source="photo-vision:test",
        ),
    ]
    inference = resolve_era(_dior_source(country="Italy"), rec, photo_signals)
    assert inference.chosen_era_label == "Gianfranco Ferré Era (1989–1996)"
    assert inference.confidence != "low"


def test_returns_empty_with_no_signals_no_brand():
    src = SourceGarment(source_kind="manual", marketplace=Marketplace.unknown)
    inference = resolve_era(src, None, [])
    assert inference.chosen_era_label is None
