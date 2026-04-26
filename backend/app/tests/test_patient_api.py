import pytest
from app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_patient_triage_endpoint_works_without_keys():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/patient/triage", json={"symptoms_text": "high fever for 2 days"}
        )
        assert res.status_code == 200
        body = res.json()
        assert "specialty" in body
        assert "urgency" in body
        assert "confidence" in body
        assert "rationale" in body
        assert "citations" in body
