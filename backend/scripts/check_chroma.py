import chromadb, inspect, traceback

# Test basic upsert with chromadb 1.3.7
try:
    c = chromadb.PersistentClient(path="./chroma_test")
    col = c.get_or_create_collection("test_sig")
    print("upsert sig:", inspect.signature(col.upsert))
    print("query sig:", inspect.signature(col.query))
    print("add sig:", inspect.signature(col.add))
except Exception as e:
    traceback.print_exc()

# Test actual upsert with embedding
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")
    emb = model.encode("test hospital cardiology").tolist()
    print("embedding length:", len(emb))
    print("embedding type:", type(emb[0]))

    col.upsert(
        ids=["1"],
        embeddings=[emb],
        documents=["test hospital"],
        metadatas=[{"hospital_id": 1, "name": "test"}],
    )
    print("upsert OK")
    print("count:", col.count())
except Exception as e:
    traceback.print_exc()
