from __future__ import annotations

"""
RAG / Vector Search Service — Chroma 1.3.7 + sentence-transformers 5.x

Architecture:
  1. Hospital documents embedded with all-MiniLM-L6-v2 (384-dim)
  2. Stored in Chroma PersistentClient with cosine similarity
  3. Hybrid retrieval:
       a) SQL geo filter (haversine) → candidate hospital IDs
       b) Chroma vector search within candidate set → re-ranked results
  4. Used by POST /patient/recommendations

Anti-hallucination: embeddings only affect ranking order.
  All patient-facing data comes from PostgreSQL, never from Chroma.
"""

import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_model = None
_chroma_client = None
_collection = None

COLLECTION_NAME = "hospitals"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading embedding model %s ...", EMBEDDING_MODEL)
        _model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Embedding model loaded.")
    return _model


def _get_collection():
    global _chroma_client, _collection
    if _collection is None:
        import chromadb

        _chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        _collection = _chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "Chroma collection '%s' ready. Documents: %d",
            COLLECTION_NAME,
            _collection.count(),
        )
    return _collection


def _build_hospital_document(
    name: str,
    address: str,
    specialties: list[str],
    status: str,
    icu_available: int,
    general_available: int,
    ventilators_available: int,
    is_24x7: bool,
    phone: str | None,
) -> str:
    spec_str = ", ".join(s.replace("_", " ").title() for s in specialties) or "General Medicine"
    beds = icu_available + general_available
    vent_str = f"Ventilators available: {ventilators_available}." if ventilators_available else ""
    hours = "Open 24 hours, 7 days a week." if is_24x7 else "Not 24x7."
    contact = f"Contact: {phone}." if phone else ""
    return (
        f"{name} is a hospital located at {address}. "
        f"Medical specialties: {spec_str}. "
        f"Status: {status}. "
        f"Available beds: {beds} (ICU: {icu_available}, General: {general_available}). "
        f"{vent_str} {hours} {contact}"
    ).strip()


def index_hospital(
    *,
    hospital_id: int,
    name: str,
    address: str,
    specialties: list[str],
    status: str,
    icu_available: int,
    general_available: int,
    ventilators_available: int,
    is_24x7: bool,
    phone: str | None,
    city: str = "",
    country: str = "",
) -> None:
    """Embed and upsert one hospital. Idempotent."""
    try:
        collection = _get_collection()
        model = _get_model()

        doc = _build_hospital_document(
            name=name,
            address=address,
            specialties=specialties,
            status=status,
            icu_available=icu_available,
            general_available=general_available,
            ventilators_available=ventilators_available,
            is_24x7=is_24x7,
            phone=phone,
        )

        embedding = model.encode(doc).tolist()

        collection.upsert(
            ids=[str(hospital_id)],
            embeddings=[embedding],
            documents=[doc],
            metadatas=[
                {
                    "hospital_id": hospital_id,
                    "name": name,
                    "city": city,
                    "country": country,
                    "specialties": ",".join(specialties),
                    "status": status,
                    "icu_available": icu_available,
                    "general_available": general_available,
                }
            ],
        )
    except Exception as exc:
        logger.warning("Failed to index hospital %d: %s", hospital_id, exc)


def index_all_hospitals() -> int:
    """
    Load all hospitals from PostgreSQL and index into Chroma.
    Returns count of hospitals indexed.
    """
    from app.db.session import SessionLocal
    from app.models.hospital import Hospital
    from app.models.specialty import HospitalSpecialty
    from sqlalchemy import select

    db = SessionLocal()
    try:
        hospitals = db.scalars(select(Hospital)).all()
        count = 0
        for h in hospitals:
            specs = list(
                db.scalars(
                    select(HospitalSpecialty.name).where(HospitalSpecialty.hospital_id == h.id)
                ).all()
            )
            parts = [p.strip() for p in h.address.split(",")]
            city = parts[0] if parts else ""
            country = parts[-1] if len(parts) > 1 else ""

            index_hospital(
                hospital_id=h.id,
                name=h.name,
                address=h.address,
                specialties=specs,
                status=h.status.value,
                icu_available=h.icu_available,
                general_available=h.general_available,
                ventilators_available=h.ventilators_available,
                is_24x7=h.is_24x7,
                phone=h.phone,
                city=city,
                country=country,
            )
            count += 1

        logger.info("Indexed %d hospitals into Chroma.", count)
        return count
    finally:
        db.close()


def rerank_by_similarity(
    *,
    query_text: str,
    candidate_ids: list[int],
    top_n: int = 10,
) -> list[int]:
    """
    Re-rank candidate hospital IDs by cosine similarity to query_text.

    Chroma 1.3.7: use `ids` parameter to filter by candidate set
    (the `where` metadata filter has changed in this version).
    Falls back to original order on any error.
    """
    if not candidate_ids:
        return []

    try:
        collection = _get_collection()
        if collection.count() == 0:
            logger.warning("Chroma collection empty — skipping re-rank.")
            return candidate_ids[:top_n]

        model = _get_model()
        query_embedding = model.encode(query_text).tolist()

        # Chroma 1.3.7: filter by IDs directly using the `ids` parameter
        str_ids = [str(cid) for cid in candidate_ids]
        n = min(top_n, len(candidate_ids))

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n,
            ids=str_ids,  # filter to candidate set only
            include=["metadatas", "distances"],
        )

        if not results or not results.get("ids") or not results["ids"][0]:
            return candidate_ids[:top_n]

        reranked = [int(id_) for id_ in results["ids"][0]]
        # Append any candidates Chroma didn't return (safety net)
        seen = set(reranked)
        for cid in candidate_ids:
            if cid not in seen:
                reranked.append(cid)
        return reranked[:top_n]

    except Exception as exc:
        logger.warning("Vector re-rank failed (%s) — using original order.", exc)
        return candidate_ids[:top_n]


def get_index_stats() -> dict[str, Any]:
    try:
        collection = _get_collection()
        return {
            "indexed_hospitals": collection.count(),
            "collection": COLLECTION_NAME,
            "model": EMBEDDING_MODEL,
        }
    except Exception as exc:
        return {"error": str(exc)}
