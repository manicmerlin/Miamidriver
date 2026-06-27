"""Pydantic models that form the contract between the backend's modules.

A `SourceGarment` is what we extract from the user's input (a tag photo or a
marketplace URL). A `FitProfile` is the portable "fits me" signature we build
from one or more source garments. `MarketplaceQuery` is what we hand back to
the iOS client for copy-paste search.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


# -- Enums ---------------------------------------------------------------------


class Marketplace(str, Enum):
    depop = "depop"
    ebay = "ebay"
    mercari = "mercari"
    poshmark = "poshmark"
    grailed = "grailed"
    vestiaire = "vestiaire"
    unknown = "unknown"


class GarmentType(str, Enum):
    shirt = "shirt"
    polo = "polo"
    tshirt = "tshirt"
    sweater = "sweater"
    jacket = "jacket"
    coat = "coat"
    pants = "pants"
    shorts = "shorts"
    suit = "suit"
    blazer = "blazer"
    unknown = "unknown"


class Confidence(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


# -- Field-with-confidence helper ---------------------------------------------


class Signal(BaseModel):
    """A single extracted fact plus how sure we are and where it came from."""

    value: str
    confidence: Confidence = Confidence.medium
    source: str = Field(
        description="Short tag like 'depop:title', 'tag-ocr', 'brand-kb', 'listing-description'"
    )


# -- Measurements --------------------------------------------------------------


class Measurement(BaseModel):
    """A single garment dimension. Unit is the unit the listing used —
    we don't silently convert; we keep both as separate measurements if needed."""

    name: Literal[
        "chest",
        "shoulder",
        "sleeve",
        "length",  # back / center back length
        "waist",
        "hip",
        "rise",
        "inseam",
        "thigh",
        "neck",
        "bicep",
        "hem",
    ]
    value: float
    unit: Literal["in", "cm"] = "in"
    source: str = Field(description="'listing-stated', 'tag', 'cv-estimate', 'brand-kb'")
    confidence: Confidence = Confidence.medium


# -- Source garment (the input) ------------------------------------------------


class SourceGarment(BaseModel):
    """The raw extracted facts from one user-supplied input."""

    source_kind: Literal["url", "tag_image", "manual"]
    source_url: HttpUrl | None = None
    marketplace: Marketplace = Marketplace.unknown

    title: str | None = None
    description: str | None = None
    photo_urls: list[HttpUrl] = Field(default_factory=list)

    brand: Signal | None = None
    line: Signal | None = Field(
        default=None,
        description="Sub-line / collection within the brand, e.g. 'J.Crew Slim Untucked', 'Christian Dior Monsieur'",
    )
    garment_type: GarmentType = GarmentType.unknown
    size: Signal | None = None
    country_of_origin: Signal | None = None
    fabric_content: Signal | None = None
    era_hint: Signal | None = Field(
        default=None, description="Best-effort decade or year range from tag style / serial / fonts"
    )

    measurements: list[Measurement] = Field(default_factory=list)

    raw_seller_size_label: str | None = Field(
        default=None,
        description="Whatever the seller wrote in the size field — preserved verbatim so we can match similar listings",
    )


# -- Brand knowledge base entries ---------------------------------------------


class BrandEra(BaseModel):
    label: str
    years: tuple[int, int] | None = None
    tag_markers: list[str] = Field(default_factory=list)
    notable_lines: list[str] = Field(default_factory=list)
    sizing_notes: str | None = None


class BrandRecord(BaseModel):
    canonical_name: str
    aliases: list[str] = Field(default_factory=list)
    eras: list[BrandEra] = Field(default_factory=list)
    common_lines: list[str] = Field(default_factory=list)
    search_synonyms: list[str] = Field(
        default_factory=list,
        description="Strings the brand is searched under across marketplaces, including misspellings",
    )
    notes: str | None = None


# -- Fit profile (the output we want to keep around) --------------------------


class FitProfile(BaseModel):
    """The portable 'fits me' signature derived from a SourceGarment."""

    id: str
    derived_from: list[str] = Field(
        default_factory=list,
        description="Source URLs or 'tag-image:<sha>' the profile was built from",
    )

    brand: str | None = None
    line: str | None = None
    era_label: str | None = None
    garment_type: GarmentType = GarmentType.unknown
    size_label: str | None = None
    country_of_origin: str | None = None
    fabric_content: str | None = None

    measurements: list[Measurement] = Field(default_factory=list)

    notes: list[str] = Field(
        default_factory=list,
        description="Human-readable notes the user might add ('runs long in the sleeve', etc.)",
    )


# -- Marketplace search-term output -------------------------------------------


class MarketplaceQuery(BaseModel):
    marketplace: Marketplace
    queries: list[str] = Field(
        description="2–5 copy-pasteable search strings, ranked from most-targeted to broadest"
    )
    deep_link: str | None = Field(
        default=None,
        description="URL that pre-fills the marketplace search with the top query, when supported",
    )
    tips: list[str] = Field(
        default_factory=list,
        description="Site-specific filters to hand-apply ('set size to L', 'sort by newest')",
    )


# -- Sizing knowledge base ----------------------------------------------------


class SizeChartTier(str, Enum):
    """Provenance tier — UI shows this so the user knows whether numbers are
    real (`researched`) or my best-guess fillers (`estimated`)."""

    estimated = "estimated"
    researched = "researched"
    user_contributed = "user_contributed"


class SizeChartEntry(BaseModel):
    """Canonical measurements for a single (brand, line, era, garment_type, size).

    Convention: every measurement value is pit-to-pit (half-chest) /
    flat-laid, in inches, unless explicitly tagged otherwise on the
    Measurement itself.

    The `tier` field is the critical signal: `estimated` means I (the model)
    wrote in a plausible number from general knowledge — treat with caution.
    `researched` means the entry was derived from a cited source (brand
    archive page, sampled listings, Reddit/blog comparison post) and the
    sources are in `citations`.
    """

    brand: str
    line: str
    era_label: str
    garment_type: GarmentType
    size_label: str
    measurements: list[Measurement]
    source: str = Field(
        description="'curated:archive', 'curated:historical-listings', 'user-contributed', etc."
    )
    tier: SizeChartTier = SizeChartTier.estimated
    citations: list[str] = Field(
        default_factory=list,
        description="URLs or short refs that back the measurements. Required when tier='researched'.",
    )
    notes: str | None = None


# -- Era inference -------------------------------------------------------------


class EraInferenceSignal(BaseModel):
    """One observation that pushed the era estimate toward a specific label."""

    label_pushed: str = Field(description="Which era_label this signal supports")
    observation: str = Field(
        description="Human-readable: 'Mauritius country tag', '70s-style pointed collar', 'sun-faded brand label'"
    )
    weight: float = Field(default=1.0, ge=0.0, le=5.0)
    source: str = Field(description="'tag-marker', 'photo-collar', 'photo-fabric', 'photo-label', etc.")


class EraInference(BaseModel):
    chosen_era_label: str | None = None
    confidence: Confidence = Confidence.low
    signals: list[EraInferenceSignal] = Field(default_factory=list)
    alternates: list[str] = Field(
        default_factory=list,
        description="Other era labels considered but ranked lower",
    )


# -- Photo features ------------------------------------------------------------


class PhotoFeatures(BaseModel):
    """Vision-model observations about a garment from its listing photos."""

    collar_style: str | None = None
    button_style: str | None = None
    fabric_pattern: str | None = None
    fit_silhouette: str | None = None
    label_aging: str | None = None
    additional_notes: list[str] = Field(default_factory=list)
    raw_response: str | None = None


# -- Cross-collection match candidates -----------------------------------------


class CrossMatchCandidate(BaseModel):
    """Another (brand, line, era, size) whose canonical measurements fit
    within tolerance of the source garment."""

    entry: SizeChartEntry
    distance: float = Field(description="Normalized L1 distance — lower is closer")
    matched_measurements: list[str] = Field(
        description="Which measurement names were compared"
    )
    delta_inches: dict[str, float] = Field(
        default_factory=dict,
        description="Per-measurement diff vs source garment, in inches",
    )
    query: "MarketplaceQuery | None" = Field(
        default=None,
        description="Optional pre-built search query for the matched combo",
    )


# -- API request / response payloads ------------------------------------------


class IngestRequest(BaseModel):
    url: HttpUrl | None = None
    notes: str | None = None


class IngestResponse(BaseModel):
    source: SourceGarment
    profile: FitProfile
    queries: list[MarketplaceQuery]
    era_inference: EraInference | None = None
    canonical_measurements: list[Measurement] = Field(
        default_factory=list,
        description="Looked up from the sizing KB for the resolved (brand, line, era, size). May differ from seller-stated.",
    )
    canonical_tier: SizeChartTier | None = Field(
        default=None,
        description="Provenance of canonical_measurements — 'researched' means cited, 'estimated' means my best guess.",
    )
    canonical_citations: list[str] = Field(
        default_factory=list,
        description="URLs / refs backing the canonical measurements.",
    )
    photo_features: PhotoFeatures | None = None
    cross_matches: list[CrossMatchCandidate] = Field(
        default_factory=list,
        description="Other vintage collections whose canonical sizing is similar.",
    )
