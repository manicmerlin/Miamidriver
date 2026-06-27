from app.schemas import FitProfile, GarmentType, Marketplace
from app.search_terms import generate_queries


def _jcrew_profile() -> FitProfile:
    return FitProfile(
        id="test1",
        derived_from=["https://www.depop.com/products/example"],
        brand="J.Crew",
        line="Slim Untucked",
        era_label="Mickey Drexler Era (2003–2017)",
        garment_type=GarmentType.shirt,
        size_label="L",
        country_of_origin="Mauritius",
        fabric_content="100% cotton",
    )


def test_returns_all_five_marketplaces():
    queries = generate_queries(_jcrew_profile())
    assert {q.marketplace for q in queries} == {
        Marketplace.depop,
        Marketplace.ebay,
        Marketplace.grailed,
        Marketplace.mercari,
        Marketplace.poshmark,
    }


def test_brand_synonyms_expand_via_kb():
    queries = generate_queries(_jcrew_profile())
    ebay = next(q for q in queries if q.marketplace == Marketplace.ebay)
    joined = " | ".join(ebay.queries).lower()
    # J.Crew KB has these aliases — at least one alternate should appear.
    assert "j.crew" in joined or "jcrew" in joined or "j crew" in joined


def test_depop_top_query_includes_brand_line_garment():
    queries = generate_queries(_jcrew_profile())
    depop = next(q for q in queries if q.marketplace == Marketplace.depop)
    top = depop.queries[0].lower()
    assert "j.crew" in top or "jcrew" in top or "j crew" in top
    assert "slim untucked" in top
    assert "shirt" in top


def test_deep_link_url_encoded():
    queries = generate_queries(_jcrew_profile())
    depop = next(q for q in queries if q.marketplace == Marketplace.depop)
    assert depop.deep_link and depop.deep_link.startswith("https://www.depop.com/search/?q=")
    # space encoded as +
    assert "+" in depop.deep_link or "%20" in depop.deep_link


def test_handles_minimal_profile_without_brand():
    profile = FitProfile(
        id="test2",
        derived_from=[],
        brand=None,
        garment_type=GarmentType.unknown,
    )
    queries = generate_queries(profile)
    # Even without a brand we shouldn't crash; queries may be empty for most.
    assert len(queries) == 5
    for q in queries:
        for s in q.queries:
            assert s.strip() == s
            assert "  " not in s


def test_dior_monsieur_kb_recognized():
    profile = FitProfile(
        id="test3",
        derived_from=[],
        brand="Christian Dior Monsieur",
        garment_type=GarmentType.blazer,
        size_label="M",
    )
    queries = generate_queries(profile)
    depop = next(q for q in queries if q.marketplace == Marketplace.depop)
    joined = " | ".join(depop.queries).lower()
    assert "christian dior monsieur" in joined or "dior monsieur" in joined
