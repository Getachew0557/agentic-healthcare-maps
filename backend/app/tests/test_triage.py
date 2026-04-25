import pytest

from app.services.triage import triage_with_citations


@pytest.mark.asyncio
async def test_triage_fallback_chest_pain(monkeypatch):
    # Force provider keys missing by patching settings fields.
    from app.core import config

    monkeypatch.setattr(config.settings, "gemini_api_key", None, raising=False)
    monkeypatch.setattr(config.settings, "tavily_api_key", None, raising=False)

    res = await triage_with_citations("chest pain and difficulty breathing")
    assert res.specialty == "cardiology"
    assert res.urgency == "emergency"
    assert 0.0 <= res.confidence <= 1.0
    assert isinstance(res.rationale, str) and len(res.rationale) > 0
    assert res.citations == []

