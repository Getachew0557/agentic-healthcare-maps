"""
Live chat test — exercises the full triage + recommendations pipeline.
Run from backend/ directory with:
    python app/tests/test_chat_live.py
"""
from __future__ import annotations

import asyncio
import json
import sys
import os

# backend/ is two levels up from app/tests/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import httpx
import os

BASE = os.environ.get("API_BASE_URL", "http://localhost:8000/api/v1")

TESTS = [
    {
        "label": "English — cardiac emergency",
        "symptoms": "My mother has sudden chest pain and difficulty breathing",
        "lat": 19.076,
        "lng": 72.877,
    },
    {
        "label": "Hindi — cardiac emergency",
        "symptoms": "मेरी माँ को सीने में दर्द और सांस लेने में तकलीफ हो रही है",
        "lat": 19.076,
        "lng": 72.877,
    },
    {
        "label": "English — fever",
        "symptoms": "High fever for 3 days with severe headache and body ache",
        "lat": 28.6139,
        "lng": 77.2090,
    },
    {
        "label": "English — stroke signs",
        "symptoms": "My father has face droop on one side and slurred speech",
        "lat": 19.076,
        "lng": 72.877,
    },
    {
        "label": "English — pediatric",
        "symptoms": "My 5-year-old child has high fever and difficulty breathing",
        "lat": 18.520,
        "lng": 73.856,
    },
]


async def run_test(client: httpx.AsyncClient, test: dict) -> None:
    print(f"\n{'='*60}")
    print(f"TEST: {test['label']}")
    print(f"Input: {test['symptoms'][:80]}")
    print("-" * 60)

    # Step 1: Triage
    triage_res = await client.post(
        f"{BASE}/patient/triage",
        json={"symptoms_text": test["symptoms"]},
        timeout=30,
    )
    triage_res.raise_for_status()
    triage = triage_res.json()

    print(f"  Specialty  : {triage['specialty']}")
    print(f"  Urgency    : {triage['urgency']}")
    print(f"  Confidence : {triage['confidence']}")
    print(f"  Source     : {triage['claims'][0]['source'] if triage.get('claims') else 'unknown'}")
    print(f"  Citations  : {len(triage.get('citations', []))}")

    # Step 2: Recommendations
    rec_res = await client.post(
        f"{BASE}/patient/recommendations",
        json={
            "specialty": triage["specialty"],
            "urgency": triage["urgency"],
            "lat": test["lat"],
            "lng": test["lng"],
            "radius_km": 100,
        },
        timeout=30,
    )
    rec_res.raise_for_status()
    recs = rec_res.json()

    results = recs.get("results", [])
    print(f"  Hospitals found: {len(results)}")
    for i, r in enumerate(results[:3], 1):
        h = r["hospital"]
        doctors = r.get("doctors", [])
        claims = r.get("claims", [])
        print(f"\n  [{i}] {h['name']}")
        print(f"       Address  : {h['address']}")
        print(f"       Distance : {r['distance_km']} km  |  ETA: {r.get('eta_minutes', 'N/A')} min")
        print(f"       ICU avail: {h['icu_available']}  |  General: {h['general_available']}")
        print(f"       Score    : {r['score_breakdown']['total']}")
        print(f"       Doctors  : {len(doctors)}")
        for d in doctors[:2]:
            room = d.get("room")
            room_str = f"Room {room['room_code']}" if room else "Room: not on file"
            print(f"         - {d['name']} ({d['specialty']}) — {room_str}")
        print(f"       Claims   : {len(claims)} fields verified from DB")


async def main() -> None:
    print("Agentic Healthcare Maps — Live Chat Test")
    print(f"API: {BASE}")
    print()

    # Health check
    async with httpx.AsyncClient() as client:
        health = await client.get(f"{BASE}/health")
        h = health.json()
        print(f"Health: database={h['database']}  redis={h['redis']}")

        passed = 0
        failed = 0
        for test in TESTS:
            try:
                await run_test(client, test)
                passed += 1
            except Exception as e:
                print(f"\n  ERROR: {e}")
                failed += 1

    print(f"\n{'='*60}")
    print(f"Results: {passed} passed, {failed} failed")


if __name__ == "__main__":
    asyncio.run(main())
