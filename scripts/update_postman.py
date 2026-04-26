"""Add ingest + sessions/traces to Postman collection."""
import json, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
postman_path = os.path.join(root, "docs", "postman_collection.json")

with open(postman_path, encoding="utf-8") as f:
    col = json.load(f)

# ---- Ingest folder ----
ingest_folder = {
    "name": "Ingest (OCR / CSV / JSON / Excel)",
    "item": [
        {
            "name": "Preview CSV (no DB write)",
            "request": {
                "method": "POST",
                "url": "{{base_url}}/api/v1/admin/ingest",
                "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                "body": {"mode": "formdata", "formdata": [{"key": "file", "type": "file", "src": "healthcare_living_map_FINAL.csv"}]},
                "description": "Upload CSV and preview parsed records. No DB write (confirm=false default).",
            },
        },
        {
            "name": "Confirm CSV Insert (writes to DB + Chroma)",
            "request": {
                "method": "POST",
                "url": {"raw": "{{base_url}}/api/v1/admin/ingest?confirm=true", "host": ["{{base_url}}"], "path": ["api","v1","admin","ingest"], "query": [{"key":"confirm","value":"true"}]},
                "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                "body": {"mode": "formdata", "formdata": [{"key": "file", "type": "file", "src": "healthcare_living_map_FINAL.csv"}]},
                "description": "Upload CSV and insert into PostgreSQL + Chroma. Idempotent (skips existing hospitals).",
            },
        },
        {
            "name": "Upload JSON File",
            "request": {
                "method": "POST",
                "url": {"raw": "{{base_url}}/api/v1/admin/ingest?confirm=true", "host": ["{{base_url}}"], "path": ["api","v1","admin","ingest"], "query": [{"key":"confirm","value":"true"}]},
                "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                "body": {"mode": "formdata", "formdata": [{"key": "file", "type": "file", "src": "hospitals.json"}]},
                "description": "Upload JSON array of hospital objects.",
            },
        },
        {
            "name": "Upload PDF (Tesseract OCR)",
            "request": {
                "method": "POST",
                "url": "{{base_url}}/api/v1/admin/ingest",
                "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                "body": {"mode": "formdata", "formdata": [{"key": "file", "type": "file", "src": "hospital_register.pdf"}]},
                "description": "Upload scanned PDF. Tesseract OCR extracts hospital data. Preview only.",
            },
        },
        {
            "name": "Upload Image (Tesseract OCR)",
            "request": {
                "method": "POST",
                "url": "{{base_url}}/api/v1/admin/ingest",
                "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                "body": {"mode": "formdata", "formdata": [{"key": "file", "type": "file", "src": "handwritten_register.jpg"}]},
                "description": "Upload photo of handwritten hospital register. Tesseract OCR reads it.",
            },
        },
    ],
}

# ---- Add sessions/traces to Admin folder ----
admin_folder = next(f for f in col["item"] if f["name"] == "Admin")
existing_names = {item["name"] for item in admin_folder["item"]}

new_admin_items = [
    {
        "name": "List Chat Sessions (admin only)",
        "request": {
            "method": "GET",
            "url": {"raw": "{{base_url}}/api/v1/admin/sessions?limit=20", "host": ["{{base_url}}"], "path": ["api","v1","admin","sessions"], "query": [{"key":"limit","value":"20"}]},
            "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
            "description": "All patient chat sessions with message counts.",
        },
    },
    {
        "name": "Get Session Messages (admin only)",
        "request": {
            "method": "GET",
            "url": "{{base_url}}/api/v1/admin/sessions/1/messages",
            "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
            "description": "All messages in a session with tool calls and citations.",
        },
    },
    {
        "name": "List Agent Traces (admin only)",
        "request": {
            "method": "GET",
            "url": {"raw": "{{base_url}}/api/v1/admin/traces?limit=20", "host": ["{{base_url}}"], "path": ["api","v1","admin","traces"], "query": [{"key":"limit","value":"20"}]},
            "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
            "description": "AI agent traces: tools called, retrievals, claims, safety flags. Governance page for judges.",
        },
    },
]

for item in new_admin_items:
    if item["name"] not in existing_names:
        admin_folder["item"].append(item)

# ---- Insert Ingest folder before Admin ----
existing_folder_names = {f["name"] for f in col["item"]}
if "Ingest (OCR / CSV / JSON / Excel)" not in existing_folder_names:
    admin_idx = next(i for i, f in enumerate(col["item"]) if f["name"] == "Admin")
    col["item"].insert(admin_idx, ingest_folder)

with open(postman_path, "w", encoding="utf-8") as f:
    json.dump(col, f, indent=2, ensure_ascii=False)

total = sum(len(f.get("item", [])) for f in col["item"])
print(f"Postman updated: {len(col['item'])} folders, {total} total requests")
