from __future__ import annotations

import re
from dataclasses import dataclass

from app.core.config import settings
from app.schemas.patient import Citation, Claim, TriageResponse
from app.services.gemini import gemini_triage
from app.services.tavily import tavily_search


@dataclass(frozen=True)
class TriageResult:
    specialty: str
    urgency: str
    confidence: float
    rationale: str
    source: str = "fallback"  # "gemini" | "fallback"


def _fallback_triage(symptoms_text: str) -> TriageResult:
    """
    Deterministic fallback — demo-safe without API keys.
    Decision-support only, not diagnosis.
    """
    text = symptoms_text.lower()

    chest = bool(
        re.search(
            r"\b(chest pain|chest tightness|shortness of breath|difficulty breathing)\b", text
        )
    ) or ("सीने" in symptoms_text or "सांस" in symptoms_text)
    stroke = bool(re.search(r"\b(face droop|slurred speech|weakness one side)\b", text))
    trauma = bool(re.search(r"\b(bleeding|unconscious|severe accident|fracture)\b", text))
    fever = bool(re.search(r"\b(high fever|fever)\b", text))

    if chest:
        return TriageResult(
            specialty="cardiology",
            urgency="emergency",
            confidence=0.78,
            rationale="Symptoms suggest possible cardiac/respiratory emergency; prioritize nearest capable hospital.",
            source="fallback",
        )
    if stroke:
        return TriageResult(
            specialty="neurology",
            urgency="emergency",
            confidence=0.75,
            rationale="Possible stroke warning signs; time-sensitive care recommended.",
            source="fallback",
        )
    if trauma:
        return TriageResult(
            specialty="emergency",
            urgency="emergency",
            confidence=0.74,
            rationale="Possible trauma; emergency services likely required.",
            source="fallback",
        )
    if fever:
        return TriageResult(
            specialty="general_medicine",
            urgency="urgent",
            confidence=0.62,
            rationale="Fever-related symptoms; evaluation recommended.",
            source="fallback",
        )

    return TriageResult(
        specialty="general_medicine",
        urgency="normal",
        confidence=0.55,
        rationale="General triage fallback; collect more details if symptoms worsen.",
        source="fallback",
    )


async def triage_with_citations(symptoms_text: str) -> TriageResponse:
    """
    Primary path: Gemini → fallback → Tavily citations.
    Populates claims array for anti-hallucination transparency.
    """
    result: TriageResult | None = None
    citations: list[Citation] = []

    if settings.gemini_api_key:
        try:
            g = await gemini_triage(symptoms_text)
            result = TriageResult(**g, source="gemini")
        except Exception:
            result = None

    if result is None:
        result = _fallback_triage(symptoms_text)

    if settings.tavily_api_key:
        try:
            citations = await tavily_search(
                query=f"{result.specialty} emergency guidance for symptoms: {symptoms_text}",
                max_results=3,
            )
        except Exception:
            citations = []

    # Anti-hallucination claims — every field declares its source
    claims = [
        Claim(field="specialty", source=result.source, value=result.specialty),
        Claim(field="urgency", source=result.source, value=result.urgency),
        Claim(field="confidence", source=result.source, value=str(round(result.confidence, 2))),
        Claim(
            field="citations",
            source="tavily" if citations else "unavailable",
            value=f"{len(citations)} sources",
        ),
    ]

    return TriageResponse(
        specialty=result.specialty,
        urgency=result.urgency,
        confidence=float(result.confidence),
        rationale=result.rationale,
        citations=citations,
        claims=claims,
    )
