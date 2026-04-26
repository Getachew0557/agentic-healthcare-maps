from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings
from app.schemas.patient import Citation


async def tavily_search(*, query: str, max_results: int = 3) -> list[Citation]:
    """
    Tavily Search API for citation-backed guidance.
    Returns a small list of citations only (title + url).
    """
    if not settings.tavily_api_key:
        raise RuntimeError("TAVILY_API_KEY not configured")

    url = "https://api.tavily.com/search"
    payload: dict[str, Any] = {
        "api_key": settings.tavily_api_key,
        "query": query,
        "max_results": max_results,
        "include_answer": False,
        "include_raw_content": False,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(url, json=payload)
        res.raise_for_status()
        data = res.json()

    results = data.get("results", []) or []
    citations: list[Citation] = []
    for r in results[:max_results]:
        title = (r.get("title") or "").strip()
        link = (r.get("url") or "").strip()
        if title and link:
            citations.append(Citation(title=title, url=link))
    return citations

