from backend.app.main import app
for r in app.routes:
    if hasattr(r, 'path'):
        p = r.path
        if 'valid' in p or 'gener' in p:
            print(p, getattr(r, 'methods', None))
