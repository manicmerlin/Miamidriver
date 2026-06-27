"""Vision pipeline — tag photo → structured SourceGarment fragment.

Provider is pluggable: `anthropic` uses Claude's vision API for OCR +
classification in one shot; `stub` returns a deterministic empty result so
the backend can boot without an API key during development.
"""

from .tag_ocr import classify_tag_image

__all__ = ["classify_tag_image"]
