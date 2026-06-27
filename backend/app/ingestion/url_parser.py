from __future__ import annotations

from urllib.parse import urlparse

import httpx

from ..config import settings
from ..schemas import Marketplace, SourceGarment
from . import depop, ebay, generic, grailed, mercari, poshmark


def detect_marketplace(url: str) -> Marketplace:
    host = (urlparse(url).hostname or "").lower().lstrip(".")
    host = host.removeprefix("www.").removeprefix("m.")
    if host.endswith("depop.com"):
        return Marketplace.depop
    if host.endswith("ebay.com") or host.endswith("ebay.co.uk") or host.endswith("ebay.de"):
        return Marketplace.ebay
    if host.endswith("mercari.com"):
        return Marketplace.mercari
    if host.endswith("poshmark.com"):
        return Marketplace.poshmark
    if host.endswith("grailed.com"):
        return Marketplace.grailed
    if host.endswith("vestiairecollective.com"):
        return Marketplace.vestiaire
    return Marketplace.unknown


async def _fetch_html(url: str) -> str:
    headers = {
        "User-Agent": settings.user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    async with httpx.AsyncClient(
        timeout=settings.fetch_timeout_seconds,
        follow_redirects=True,
        headers=headers,
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text


_EXTRACTORS = {
    Marketplace.depop: depop.extract,
    Marketplace.ebay: ebay.extract,
    Marketplace.mercari: mercari.extract,
    Marketplace.poshmark: poshmark.extract,
    Marketplace.grailed: grailed.extract,
}


async def fetch_source_garment(url: str) -> SourceGarment:
    marketplace = detect_marketplace(url)
    html = await _fetch_html(url)
    extractor = _EXTRACTORS.get(marketplace, generic.extract)
    return extractor(url=url, html=html, marketplace=marketplace)
