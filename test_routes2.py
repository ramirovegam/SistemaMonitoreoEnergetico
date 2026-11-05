import sys
sys.path.insert(0, '.')
from backend.app.main import app
for r in app.routes:
    t = type(r).__name__
    if t == 'APIRoute':
        if 'gener' in r.path:
            print('ROUTE', r.path)
    elif t == 'Mount':
        print('MOUNT', getattr(r,'path',None))
    elif hasattr(r, 'routes'):
        for sr in r.routes:
            t2 = type(sr).__name__
            if t2 == 'APIRoute' and 'gener' in sr.path:
                print('SUB', sr.path)
            elif hasattr(sr, 'routes'):
                for ssr in sr.routes:
                    if type(ssr).__name__ == 'APIRoute' and 'gener' in ssr.path:
                        print('SUB2', ssr.path)
