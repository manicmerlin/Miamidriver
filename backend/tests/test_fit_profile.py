from app.profile import build_fit_profile
from app.schemas import (
    Confidence,
    GarmentType,
    Marketplace,
    Measurement,
    Signal,
    SourceGarment,
)


def _depop_source() -> SourceGarment:
    return SourceGarment(
        source_kind="url",
        source_url="https://www.depop.com/products/example-listing",
        marketplace=Marketplace.depop,
        title="J.Crew Slim Untucked plaid shirt",
        description="pit to pit 22\", length 30\", made in Mauritius",
        brand=Signal(value="J.Crew", confidence=Confidence.high, source="depop:product.brand"),
        size=Signal(value="L", confidence=Confidence.high, source="depop:product.size"),
        garment_type=GarmentType.shirt,
        raw_seller_size_label="L",
        country_of_origin=Signal(
            value="Mauritius", confidence=Confidence.high, source="depop:description"
        ),
        measurements=[
            Measurement(name="chest", value=22, unit="in", source="listing-stated"),
            Measurement(name="length", value=30, unit="in", source="listing-stated"),
        ],
    )


def test_profile_resolves_brand_via_kb():
    p = build_fit_profile([_depop_source()])
    assert p.brand == "J.Crew"
    assert p.line == "Slim Untucked"
    assert p.garment_type == GarmentType.shirt
    assert p.size_label == "L"
    assert p.country_of_origin == "Mauritius"


def test_profile_picks_drexler_era_from_mauritius_marker():
    p = build_fit_profile([_depop_source()])
    assert p.era_label is not None
    assert "Drexler" in p.era_label


def test_profile_includes_measurements():
    p = build_fit_profile([_depop_source()])
    by_name = {m.name: m for m in p.measurements}
    assert by_name["chest"].value == 22
    assert by_name["length"].value == 30
