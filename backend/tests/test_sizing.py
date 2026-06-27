from app.schemas import GarmentType
from app.sizing import all_charts, lookup_size_chart


def test_dior_monsieur_l_bohan_resolved():
    chart = lookup_size_chart(
        brand="Christian Dior Monsieur",
        line="Monsieur Long-Sleeve Sport Shirt",
        era_label="Marc Bohan Era (1970–1989)",
        garment_type=GarmentType.shirt,
        size_label="L",
    )
    assert chart is not None
    assert chart.brand == "Christian Dior Monsieur"
    assert chart.size_label == "L"
    assert chart.tier == "researched"
    assert chart.citations, "researched entries must carry citations"
    chest = next(m for m in chart.measurements if m.name == "chest")
    assert chest.value == 23.0  # pit-to-pit, half-chest
    assert chest.unit == "in"


def test_jcrew_slim_untucked_l_drexler_is_marked_estimated():
    chart = lookup_size_chart(
        brand="J.Crew",
        line="Slim Untucked",
        era_label="Mickey Drexler Era (2003–2017)",
        garment_type=GarmentType.shirt,
        size_label="L",
    )
    assert chart is not None
    assert chart.tier == "estimated"
    chest = next(m for m in chart.measurements if m.name == "chest")
    # Half-chest pit-to-pit value, NOT the doubled full-chest from earlier rev.
    assert chest.value == 22.0


def test_returns_none_when_brand_missing():
    chart = lookup_size_chart(
        brand=None,
        line=None,
        era_label=None,
        garment_type=GarmentType.shirt,
        size_label="L",
    )
    assert chart is None


def test_falls_back_without_line_or_era():
    # Brand + size still match; line/era weight less than the threshold but
    # brand+size alone is >= 15 (10 + 5)
    chart = lookup_size_chart(
        brand="Brooks Brothers",
        line=None,
        era_label=None,
        garment_type=GarmentType.shirt,
        size_label="L",
    )
    assert chart is not None
    assert chart.brand == "Brooks Brothers"


def test_all_charts_loaded():
    charts = all_charts()
    brands = {c.brand for c in charts}
    assert "Christian Dior Monsieur" in brands
    assert "J.Crew" in brands
    assert "Polo Ralph Lauren" in brands
    assert "Brooks Brothers" in brands
