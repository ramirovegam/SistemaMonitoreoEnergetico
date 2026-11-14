from backend.app.main import app
for r in app.routes:
    if hasattr(r, 'path'):
        if 'gen' in r.path or 'valid' in r.path:
            print(r.path)
