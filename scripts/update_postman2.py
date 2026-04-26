"""Add contact, admin hospital CRUD, and user management to Postman collection."""
import json, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
postman_path = os.path.join(root, "docs", "postman_collection.json")

with open(postman_path, encoding="utf-8") as f:
    col = json.load(f)

existing_folder_names = {f["name"] for f in col["item"]}

# ---- Contact folder ----
if "Contact" not in existing_folder_names:
    contact_folder = {
        "name": "Contact",
        "item": [
            {
                "name": "Submit Contact Form",
                "request": {
                    "method": "POST",
                    "url": "{{base_url}}/api/v1/contact",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({
                            "name": "Dr. Arjun Sharma",
                            "email": "arjun@cityhospital.com",
                            "subject": "Register our hospital on the platform",
                            "message": "We would like to register City Hospital Mumbai on Agentic Healthcare Maps. Please advise on the process.",
                        }, indent=2),
                    },
                    "description": "Public contact form — no authentication required.\n\nUse cases:\n- Hospitals requesting to join the platform\n- Users reporting issues\n- General enquiries",
                },
                "response": [
                    {
                        "name": "200 OK",
                        "status": "OK",
                        "code": 200,
                        "body": '{"status": "received", "message": "Thank you for contacting us. We will respond within 24 hours."}',
                    }
                ],
            }
        ],
    }
    # Insert after Auth
    auth_idx = next(i for i, f in enumerate(col["item"]) if f["name"] == "Auth")
    col["item"].insert(auth_idx + 1, contact_folder)

# ---- Admin Hospital CRUD folder ----
if "Admin — Hospital Management" not in existing_folder_names:
    admin_hospital_folder = {
        "name": "Admin — Hospital Management",
        "item": [
            {
                "name": "List All Hospitals (admin)",
                "request": {
                    "method": "GET",
                    "url": {"raw": "{{base_url}}/api/v1/admin/hospitals?limit=50", "host": ["{{base_url}}"], "path": ["api","v1","admin","hospitals"], "query": [{"key":"limit","value":"50"},{"key":"search","value":"","disabled":True},{"key":"status","value":"","disabled":True}]},
                    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                    "description": "Paginated list of all hospitals. Filterable by name search and status. Admin only.",
                },
            },
            {
                "name": "Create Hospital (admin)",
                "request": {
                    "method": "POST",
                    "url": "{{base_url}}/api/v1/admin/hospitals",
                    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({
                            "name": "New City Hospital",
                            "address": "Andheri West, Mumbai, Maharashtra, India",
                            "phone": "+91-22-12345678",
                            "lat": 19.1197,
                            "lng": 72.8397,
                            "is_24x7": True,
                            "status": "normal",
                            "icu_total": 20,
                            "icu_available": 12,
                            "general_total": 150,
                            "general_available": 80,
                            "ventilators_available": 5,
                            "specialties": ["cardiology", "emergency", "neurology"],
                        }, indent=2),
                    },
                    "description": "Create a new hospital with full profile. Specialties are created automatically. Admin only.",
                },
            },
            {
                "name": "Get Hospital by ID (admin)",
                "request": {
                    "method": "GET",
                    "url": "{{base_url}}/api/v1/admin/hospitals/{{hospital_id}}",
                    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                    "description": "Full hospital detail. Admin only.",
                },
            },
            {
                "name": "Update Any Hospital (admin)",
                "request": {
                    "method": "PATCH",
                    "url": "{{base_url}}/api/v1/admin/hospitals/{{hospital_id}}",
                    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({"name": "Updated Hospital Name", "is_24x7": True, "status": "normal"}, indent=2),
                    },
                    "description": "Update any hospital's profile. Admin only.",
                },
            },
            {
                "name": "Delete Hospital (admin)",
                "request": {
                    "method": "DELETE",
                    "url": "{{base_url}}/api/v1/admin/hospitals/{{hospital_id}}",
                    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                    "description": "Permanently delete a hospital and all related data. Admin only.",
                },
            },
            {
                "name": "Get Own Hospital (hospital_staff)",
                "request": {
                    "method": "GET",
                    "url": "{{base_url}}/api/v1/admin/hospitals/me",
                    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                    "description": "Returns the hospital linked to the authenticated hospital_staff user.",
                },
            },
            {
                "name": "Update Own Hospital (hospital_staff)",
                "request": {
                    "method": "PATCH",
                    "url": "{{base_url}}/api/v1/admin/hospitals/me",
                    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({
                            "phone": "+91-22-99887766",
                            "is_24x7": True,
                            "address": "123 Main Road, Bandra West, Mumbai",
                        }, indent=2),
                    },
                    "description": "Hospital staff self-service: update own hospital profile (name, address, phone, coordinates, bed counts, status).",
                },
            },
        ],
    }
    # Insert before Admin folder
    admin_idx = next(i for i, f in enumerate(col["item"]) if f["name"] == "Admin")
    col["item"].insert(admin_idx, admin_hospital_folder)

# ---- Admin User Management folder ----
if "Admin — User Management" not in existing_folder_names:
    user_mgmt_folder = {
        "name": "Admin — User Management",
        "item": [
            {
                "name": "List All Users (admin)",
                "request": {
                    "method": "GET",
                    "url": {"raw": "{{base_url}}/api/v1/admin/users?limit=50", "host": ["{{base_url}}"], "path": ["api","v1","admin","users"], "query": [{"key":"limit","value":"50"},{"key":"role","value":"","disabled":True},{"key":"hospital_id","value":"","disabled":True}]},
                    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                    "description": "All registered users. Filterable by role and hospital_id. Admin only.",
                },
            },
            {
                "name": "Get User by ID (admin)",
                "request": {
                    "method": "GET",
                    "url": "{{base_url}}/api/v1/admin/users/{{user_id}}",
                    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                    "description": "Single user profile. Admin only.",
                },
            },
            {
                "name": "Update User Role/Hospital (admin)",
                "request": {
                    "method": "PATCH",
                    "url": "{{base_url}}/api/v1/admin/users/{{user_id}}",
                    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({"role": "hospital_staff", "hospital_id": 1}, indent=2),
                    },
                    "description": "Update user role or hospital assignment. Admin only.",
                },
            },
            {
                "name": "Delete User (admin)",
                "request": {
                    "method": "DELETE",
                    "url": "{{base_url}}/api/v1/admin/users/{{user_id}}",
                    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
                    "description": "Permanently delete a user. Cannot delete yourself. Admin only.",
                },
            },
        ],
    }
    # Insert before Admin folder
    admin_idx = next(i for i, f in enumerate(col["item"]) if f["name"] == "Admin")
    col["item"].insert(admin_idx, user_mgmt_folder)

# Add user_id variable if missing
var_keys = {v["key"] for v in col["variable"]}
if "user_id" not in var_keys:
    col["variable"].append({"key": "user_id", "value": "1", "type": "string"})

with open(postman_path, "w", encoding="utf-8") as f:
    json.dump(col, f, indent=2, ensure_ascii=False)

total = sum(len(f.get("item", [])) for f in col["item"])
print(f"Postman updated: {len(col['item'])} folders, {total} total requests")
