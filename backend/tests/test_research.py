"""Unit tests for the research module — focused on the JSON parser and
the prompt construction, not on the live web search (which would make CI
brittle and cost money)."""

from app.research.web_lookup import _parse_json_loose, _confidence_from
from app.schemas import Confidence


def test_parses_clean_json():
    parsed = _parse_json_loose('{"measurements": {"chest": 23.0}, "citations": ["https://x"], "confidence": "high"}')
    assert parsed is not None
    assert parsed["measurements"]["chest"] == 23.0


def test_strips_markdown_fences():
    text = '```json\n{"measurements": {"chest": 22.5}}\n```'
    parsed = _parse_json_loose(text)
    assert parsed is not None
    assert parsed["measurements"]["chest"] == 22.5


def test_pulls_json_from_prose():
    text = "Sure! Here are the measurements I found: {\"measurements\": {\"chest\": 21.0}, \"citations\": []} — hope that helps."
    parsed = _parse_json_loose(text)
    assert parsed is not None
    assert parsed["measurements"]["chest"] == 21.0


def test_returns_none_on_garbage():
    assert _parse_json_loose("nothing useful here") is None
    assert _parse_json_loose("") is None


def test_confidence_parsing():
    assert _confidence_from("high") == Confidence.high
    assert _confidence_from("MEDIUM") == Confidence.medium
    assert _confidence_from("low") == Confidence.low
    assert _confidence_from(None) == Confidence.medium
    assert _confidence_from("garbage") == Confidence.medium
