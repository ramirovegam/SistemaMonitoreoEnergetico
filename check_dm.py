from backend.app.database import engine
from sqlalchemy import text
with engine.connect() as c:
    r = c.execute(text("SELECT table_name FROM information_schema.views WHERE table_schema='datamart'"))
    for x in r:
        print(x[0])
