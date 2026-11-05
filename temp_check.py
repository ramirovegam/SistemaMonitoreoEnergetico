from backend.app.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    for t in ['zona','servicio','medidor','lectura','calendario','corrida_generacion']:
        try:
            r = conn.execute(text(f'SELECT count(*) FROM energia.{t}'))
            print(t, r.scalar())
        except Exception as e:
            print('ERR', t, str(e)[:80])
