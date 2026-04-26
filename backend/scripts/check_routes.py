import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.api.v1.router import api_router
routes = [(list(r.methods)[0] if hasattr(r, 'methods') else 'WS', r.path) for r in api_router.routes if hasattr(r, 'path')]
for m, p in sorted(routes, key=lambda x: x[1]):
    print(m, p)
print('Total:', len(routes))
