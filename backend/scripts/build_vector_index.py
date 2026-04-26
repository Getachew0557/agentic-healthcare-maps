"""
Build the Chroma vector index from all hospitals in PostgreSQL.

Usage (from backend/ directory, with agentic_env active):
    python scripts/build_vector_index.py

Run this:
  - Once after first setup
  - After bulk CSV import
  - After adding many hospitals manually

The index is persisted to CHROMA_PERSIST_DIR (default: ./chroma_data).
"""
from __future__ import annotations

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main() -> None:
    print("Building Chroma vector index...")
    print("Loading sentence-transformers model (first run downloads ~90MB)...")

    start = time.time()
    from app.services.vector.embeddings import index_all_hospitals, get_index_stats

    count = index_all_hospitals()
    elapsed = time.time() - start

    stats = get_index_stats()
    print(f"\nDone in {elapsed:.1f}s")
    print(f"  Hospitals indexed : {count}")
    print(f"  Chroma collection : {stats.get('collection')}")
    print(f"  Total in index    : {stats.get('indexed_hospitals')}")
    print(f"  Model             : {stats.get('model')}")
    print(f"\nIndex stored at: {os.path.abspath('chroma_data')}")


if __name__ == "__main__":
    main()
