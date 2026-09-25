
### Terminal 1
# 1. Crear entorno virtual
python -m venv ven

# 2. Activarlo
.\ven\Scripts\Activate.ps1

# 3. Instalar dependencias del backend
pip install -r requirements.txt

# 4. Levantar FastAPI
uvicorn backend.app.main:app --reload

ejemplo
BACKEND
http://127.0.0.1:8000

SWAGGER
http://127.0.0.1:8000/docs

### Terminal 2
npm run dev


FRONT
VITE ready
➜ Local: http://localhost:5173/
