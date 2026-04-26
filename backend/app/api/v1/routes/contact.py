from __future__ import annotations

"""
POST /api/v1/contact

Public contact form endpoint.
Stores the submission in the DB (agent_traces table reused as a simple log)
and returns a confirmation. No auth required.

For production: wire to an email service (SendGrid, SES, etc.)
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import ContactRequest, ContactResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/contact",
    response_model=ContactResponse,
    summary="Submit a contact form",
    description="""
Public contact form — no authentication required.

Accepts name, email, subject, and message.
The submission is logged server-side.

**Use cases:**
- Hospitals requesting to join the platform
- Users reporting issues
- General enquiries

For production deployment, wire `CONTACT_EMAIL` env var to forward submissions via email.
    """,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
                        "status": "received",
                        "message": "Thank you for contacting us. We will respond within 24 hours.",
                    }
                }
            }
        }
    },
)
async def contact(
    payload: ContactRequest,
    db: Session = Depends(get_db),
) -> ContactResponse:
    # Log the contact submission as an agent trace for admin visibility
    try:
        from app.models.chat import AgentTrace
        trace = AgentTrace(
            tools_called={"type": "contact_form"},
            final_answer_json={
                "name": payload.name,
                "email": str(payload.email),
                "subject": payload.subject,
                "message": payload.message[:500],  # truncate for safety
            },
            model="contact_form",
            safety_flags={"contact_form": True},
        )
        db.add(trace)
        db.commit()
        logger.info("Contact form submission from %s: %s", payload.email, payload.subject)
    except Exception as exc:
        logger.warning("Failed to log contact form (non-fatal): %s", exc)

    # TODO: wire to email service in production
    # from app.services.email import send_contact_email
    # await send_contact_email(payload)

    return ContactResponse(
        status="received",
        message="Thank you for contacting us. We will respond to your enquiry within 24 hours.",
    )
