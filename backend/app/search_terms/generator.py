"""Per-marketplace search-term generator.

Each marketplace has its own quirks:

- Depop's search treats spaces as AND and ignores most punctuation.
  Free-text "j.crew slim untucked L plaid" works well; size filters are a
  separate UI step.
- eBay's keyword search is best with brand + key descriptors and no size
  noise; size goes in the sidebar filter. A `LH_ItemCondition=3000` (used)
  pre-filter is helpful.
- Mercari favors short queries — 3–5 tokens.
- Poshmark indexes brand + category aggressively; queries with too many
  tokens return nothing.
- Grailed has structured filters (designer, category, size, era) and a
  weak free-text search — putting brand + 1–2 descriptors works best, with
  size + designer filters applied in the UI.

We generate 2–5 queries per site, ranked targeted → broad, plus optional
deep-link URLs that pre-fill the top query.
"""

from __future__ import annotations

from urllib.parse import quote_plus

from ..brands import lookup_brand
from ..schemas import FitProfile, GarmentType, Marketplace, MarketplaceQuery


_GARMENT_WORDS = {
    GarmentType.shirt: "shirt",
    GarmentType.polo: "polo",
    GarmentType.tshirt: "tee",
    GarmentType.sweater: "sweater",
    GarmentType.jacket: "jacket",
    GarmentType.coat: "coat",
    GarmentType.pants: "pants",
    GarmentType.shorts: "shorts",
    GarmentType.suit: "suit",
    GarmentType.blazer: "blazer",
    GarmentType.unknown: "",
}


def _brand_synonyms(brand: str | None) -> list[str]:
    if not brand:
        return []
    rec = lookup_brand(brand)
    if not rec:
        return [brand]
    out = [rec.canonical_name, *rec.aliases, *rec.search_synonyms]
    # Preserve order, dedup case-insensitively.
    seen: set[str] = set()
    dedup: list[str] = []
    for v in out:
        k = v.lower()
        if k in seen:
            continue
        seen.add(k)
        dedup.append(v)
    return dedup


def _ranked(strings: list[str]) -> list[str]:
    """Strip empties, dedup preserving order, cap at 5."""
    seen: set[str] = set()
    out: list[str] = []
    for s in strings:
        s = " ".join(s.split())
        if not s or s.lower() in seen:
            continue
        seen.add(s.lower())
        out.append(s)
        if len(out) >= 5:
            break
    return out


def _q_depop(p: FitProfile) -> MarketplaceQuery:
    brand_terms = _brand_synonyms(p.brand)
    primary_brand = brand_terms[0] if brand_terms else ""
    alt_brand = brand_terms[1] if len(brand_terms) > 1 else primary_brand
    garment = _GARMENT_WORDS.get(p.garment_type, "")
    size = (p.size_label or "").strip()
    line = p.line or ""

    raw = [
        f"{primary_brand} {line} {garment} {size}".strip(),
        f"{primary_brand} {line} {garment}".strip(),
        f"{primary_brand} vintage {garment}".strip(),
        f"{alt_brand} {garment} {size}".strip(),
        f"{primary_brand} {garment}".strip(),
    ]
    queries = _ranked(raw)
    deep = (
        f"https://www.depop.com/search/?q={quote_plus(queries[0])}"
        if queries
        else None
    )
    return MarketplaceQuery(
        marketplace=Marketplace.depop,
        queries=queries,
        deep_link=deep,
        tips=[
            "Filter by size after the search loads — Depop's URL doesn't accept size in the query.",
            "Sort by 'Newest' to catch listings before they're scooped.",
        ],
    )


def _q_ebay(p: FitProfile) -> MarketplaceQuery:
    brand_terms = _brand_synonyms(p.brand)
    primary_brand = brand_terms[0] if brand_terms else ""
    garment = _GARMENT_WORDS.get(p.garment_type, "")
    line = p.line or ""
    fabric_token = ""
    if p.fabric_content:
        # 'cotton', 'wool', 'linen' — single-token fabrics dominate eBay titles.
        fabric_lower = p.fabric_content.lower()
        for k in ("cotton", "wool", "linen", "cashmere", "silk", "flannel"):
            if k in fabric_lower:
                fabric_token = k
                break

    raw = [
        f"{primary_brand} {line} {garment} {fabric_token}".strip(),
        f"{primary_brand} {line} {garment}".strip(),
        f'"{primary_brand}" {garment} vintage'.strip(),
        f"{primary_brand} {garment} {p.size_label or ''}".strip(),
        f"{primary_brand} {garment}".strip(),
    ]
    queries = _ranked(raw)
    deep = (
        f"https://www.ebay.com/sch/i.html?_nkw={quote_plus(queries[0])}&LH_ItemCondition=3000"
        if queries
        else None
    )
    return MarketplaceQuery(
        marketplace=Marketplace.ebay,
        queries=queries,
        deep_link=deep,
        tips=[
            "Apply 'Size' and 'Brand' filters in the left sidebar — eBay's keyword match is shallow.",
            "Save the search; eBay will email new matches.",
        ],
    )


def _q_mercari(p: FitProfile) -> MarketplaceQuery:
    brand_terms = _brand_synonyms(p.brand)
    primary_brand = brand_terms[0] if brand_terms else ""
    garment = _GARMENT_WORDS.get(p.garment_type, "")
    line = p.line or ""

    raw = [
        f"{primary_brand} {line} {garment}".strip(),
        f"{primary_brand} {garment} {p.size_label or ''}".strip(),
        f"{primary_brand} {garment}".strip(),
    ]
    queries = _ranked(raw)
    deep = (
        f"https://www.mercari.com/search/?keyword={quote_plus(queries[0])}"
        if queries
        else None
    )
    return MarketplaceQuery(
        marketplace=Marketplace.mercari,
        queries=queries,
        deep_link=deep,
        tips=[
            "Mercari ignores long queries — stick to 3–4 tokens.",
            "Sort by 'Newest' and check daily.",
        ],
    )


def _q_poshmark(p: FitProfile) -> MarketplaceQuery:
    brand_terms = _brand_synonyms(p.brand)
    primary_brand = brand_terms[0] if brand_terms else ""
    garment = _GARMENT_WORDS.get(p.garment_type, "")

    raw = [
        f"{primary_brand} {garment}".strip(),
        f"{primary_brand} {p.line or ''}".strip(),
        f"{primary_brand} {garment} mens".strip(),
    ]
    queries = _ranked(raw)
    deep = (
        f"https://poshmark.com/search?query={quote_plus(queries[0])}&type=listings"
        if queries
        else None
    )
    return MarketplaceQuery(
        marketplace=Marketplace.poshmark,
        queries=queries,
        deep_link=deep,
        tips=[
            "Set 'Department: Men' and the right size filter — Poshmark's main signal is brand + category.",
        ],
    )


def _q_grailed(p: FitProfile) -> MarketplaceQuery:
    brand_terms = _brand_synonyms(p.brand)
    primary_brand = brand_terms[0] if brand_terms else ""
    garment = _GARMENT_WORDS.get(p.garment_type, "")
    line = p.line or ""

    raw = [
        f"{primary_brand} {line} {garment}".strip(),
        f"{primary_brand} {garment}".strip(),
        f"{primary_brand} vintage".strip(),
    ]
    queries = _ranked(raw)
    deep = (
        f"https://www.grailed.com/shop?keywords={quote_plus(queries[0])}"
        if queries
        else None
    )
    return MarketplaceQuery(
        marketplace=Marketplace.grailed,
        queries=queries,
        deep_link=deep,
        tips=[
            "Use the 'Designer' filter (not the keyword) for known brands — Grailed matches it exactly.",
            "Apply size + category filters in the sidebar to cut noise.",
        ],
    )


def generate_queries(profile: FitProfile) -> list[MarketplaceQuery]:
    return [
        _q_depop(profile),
        _q_ebay(profile),
        _q_grailed(profile),
        _q_mercari(profile),
        _q_poshmark(profile),
    ]
