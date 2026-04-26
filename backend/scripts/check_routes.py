from app.api.v1.router import api_router
routes = [(list(r.methods)[0] if hasattr(r, 'methods') else 'WS', r.path) for r in api_router.routes if hasattr(r, 'path')]
for m, p in routes:
    print(m, p)
