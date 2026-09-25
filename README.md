================================
ARQUITECTURA DE LA APLICACIÓN
================================
La aplicación está dividida en tres capas principales:

👤 Usuario
   ↓
⚛️ Frontend - React + TypeScript + Vite
   ↓  Solicitudes HTTP / JSON
⚡ Backend - Python + FastAPI
   ↓  Consultas SQL
🐘 Base de datos - PostgreSQL
   ↑
⚡ FastAPI procesa y devuelve los datos en JSON
   ↑
⚛️ React recibe los datos y actualiza la interfaz
   ↑
👤 El usuario visualiza la información

🌐 El Frontend corre en: http://localhost:5173/
⚡ El Backend corre en: http://127.0.0.1:8000/
📖 Swagger (documentación de la API): http://127.0.0.1:8000/docs

El Frontend y el Backend funcionan como servidores independientes.
React se comunica con FastAPI mediante peticiones HTTP, FastAPI consulta
PostgreSQL y devuelve los resultados al Frontend en formato JSON.
================================
PASOS PARA CORRER LA APLICACION
================================
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
