"""Saved profiles + similar-fit learning endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..cross_match import find_cross_matches
from ..schemas import (
    CrossMatchCandidate,
    FitProfile,
    Marketplace,
    MarketplaceQuery,
)
from ..search_terms import generate_queries
from ..storage import (
    chart_key,
    list_profiles,
    load_profile,
    record_cross_match_shown,
    record_find_more_event,
    save_profile,
    similarity_boost,
)


router = APIRouter(prefix="/v1", tags=["profiles"])


@router.post("/profiles", response_model=FitProfile)
def create_profile(profile: FitProfile) -> FitProfile:
    save_profile(profile)
    return profile


@router.get("/profiles", response_model=list[FitProfile])
def get_profiles() -> list[FitProfile]:
    return list_profiles()


@router.get("/profiles/{profile_id}", response_model=FitProfile)
def get_profile(profile_id: str) -> FitProfile:
    p = load_profile(profile_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return p


class LearnRequest(BaseModel):
    source_profile_id: str
    target_chart_key: str


class LearnResponse(BaseModel):
    ok: bool = True
    pair_weight_after: float | None = None


@router.post("/learn", response_model=LearnResponse)
def learn(req: LearnRequest) -> LearnResponse:
    record_find_more_event(req.source_profile_id, req.target_chart_key)
    p = load_profile(req.source_profile_id)
    if not p:
        raise HTTPException(status_code=404, detail="Source profile not found")
    src_key = chart_key(p.brand, p.line, p.era_label, p.size_label)
    boosts = similarity_boost(src_key)
    return LearnResponse(pair_weight_after=boosts.get(req.target_chart_key))


class FindMoreResponse(BaseModel):
    profile: FitProfile
    cross_matches: list[CrossMatchCandidate]


@router.post("/find_more/{profile_id}", response_model=FindMoreResponse)
def find_more(profile_id: str) -> FindMoreResponse:
    profile = load_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    src_key = chart_key(profile.brand, profile.line, profile.era_label, profile.size_label)
    boosts = similarity_boost(src_key)

    exclude = None
    if profile.brand and profile.line and profile.era_label and profile.size_label:
        exclude = (profile.brand, profile.line, profile.era_label, profile.size_label)

    matches = find_cross_matches(
        source_measurements=profile.measurements,
        source_garment_type=profile.garment_type,
        exclude=exclude,
        learned_boosts=boosts,
    )

    for cm in matches:
        synthetic = FitProfile(
            id="synthetic",
            derived_from=[],
            brand=cm.entry.brand,
            line=cm.entry.line,
            era_label=cm.entry.era_label,
            garment_type=cm.entry.garment_type,
            size_label=cm.entry.size_label,
        )
        depop = next(
            (q for q in generate_queries(synthetic) if q.marketplace == Marketplace.depop),
            None,
        )
        cm.query = depop

    record_cross_match_shown(
        profile.id,
        [
            chart_key(c.entry.brand, c.entry.line, c.entry.era_label, c.entry.size_label)
            for c in matches
        ],
    )

    return FindMoreResponse(profile=profile, cross_matches=matches)
