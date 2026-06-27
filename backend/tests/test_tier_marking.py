"""Every SizeChartEntry that ships in the curated KB must be honestly
tagged. The Dior Monsieur Bohan sport shirt is the first researched entry;
everything else should be marked estimated until we have citations.
"""

from app.schemas import SizeChartTier
from app.sizing import all_charts


def test_no_chart_is_silently_researched_without_citations():
    for chart in all_charts():
        if chart.tier == SizeChartTier.researched:
            assert chart.citations, (
                f"researched chart {chart.brand}/{chart.line}/{chart.size_label} "
                "must include citations"
            )


def test_estimated_charts_have_no_citations_or_are_marked_baseline():
    for chart in all_charts():
        if chart.tier == SizeChartTier.estimated:
            # Source string should make the estimated nature obvious.
            assert "estimated" in chart.source or "baseline" in chart.source, (
                f"estimated chart {chart.brand}/{chart.line}/{chart.size_label} "
                f"has misleading source '{chart.source}'"
            )


def test_at_least_one_researched_entry_exists():
    # Sanity check: I claim Christian Dior Monsieur Bohan-era L is researched
    # against Grailed snippets. Make sure that survives schema/data drift.
    researched = [c for c in all_charts() if c.tier == SizeChartTier.researched]
    assert researched, "expected at least one researched entry in the seed KB"
    brands = {c.brand for c in researched}
    assert "Christian Dior Monsieur" in brands
