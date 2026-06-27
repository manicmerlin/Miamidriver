"""Runtime web-research module.

When the curated sizing KB doesn't have a `researched` entry for a given
(brand, line, era, garment_type, size), this module can be invoked to do a
live web search through Anthropic's web_search tool. The result is a
SizeChartEntry tagged `researched` with cited URLs.

Failures are non-fatal — the caller gets `None` and falls back to whatever
the KB already has (which may be estimated or absent).
"""

from .web_lookup import research_size_chart

__all__ = ["research_size_chart"]
