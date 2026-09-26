# SIMET - Sistema de Monitoreo Energético

Panel web para monitorear el consumo eléctrico de hogares, medidores y zonas de Toluca como ciudad inteligente. Proyecto de la materia *Tópicos de Tecnologías de Datos*.

## Arquitectura

La aplicación se divide en tres capas que se ejecutan de forma independiente:

| Capa          | Tecnología                                  | Dirección local              |
|---------------|---------------------------------------------|------------------------------|
| Frontend      | React 19, TypeScript, Vite, Tailwind CSS    | http://localhost:8443        |
| Backend (API) | Python, FastAPI, SQLAlchemy                 | http://127.0.0.1:8000        |
| Base de datos | PostgreSQL (esquema `energia`)              | Definida en `DATABASE_URL`   |

Flujo de una petición:

1. El usuario interactúa con la interfaz en React.
2. React envía una petición HTTP al backend y recibe JSON.
3. FastAPI consulta PostgreSQL mediante SQLAlchemy.
4. FastAPI devuelve los resultados y React actualiza la interfaz.

La documentación interactiva de la API (Swagger) está en http://127.0.0.1:8000/docs.

## Requisitos

- Python 3.10 o superior
- Node.js 20.19 o superior (requerido por Vite 8)
- PostgreSQL con el esquema `energia` creado

## Configuración

Crea un archivo `.env` en la raíz del proyecto con la cadena de conexión a la base de datos:

```env
DATABASE_URL=postgresql+psycopg://usuario:password@localhost:5432/simet
```

El backend no arranca si esta variable no está definida.

## Ejecución en desarrollo

Se necesitan dos terminales abiertas en la raíz del proyecto.

### Terminal 1: backend

```bash
# Crear el entorno virtual
python -m venv ven

# Activarlo (Windows, PowerShell)
.\ven\Scripts\Activate.ps1

# Activarlo (Linux / macOS)
source ven/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Levantar la API
uvicorn backend.app.main:app --reload
```

La API queda disponible en http://127.0.0.1:8000 y Swagger en http://127.0.0.1:8000/docs.

### Terminal 2: frontend

```bash
npm install
npm run dev
```

La interfaz queda disponible en http://localhost:8443.

## Endpoints disponibles

| Método | Ruta          | Descripción                              |
|--------|---------------|------------------------------------------|
| GET    | `/`           | Verifica que el backend está activo      |
| GET    | `/api/test`   | Prueba de comunicación con el frontend   |
| GET    | `/api/zonas/` | Lista las zonas registradas              |

## Estructura del proyecto

```
.
├── backend/app/       API FastAPI (modelos, esquemas, routers y conexión a BD)
├── src/
│   ├── components/    Páginas de la interfaz
│   ├── data/          Datos sintéticos usados mientras se conecta el backend
│   └── services/      Cliente HTTP hacia la API
├── requirements.txt   Dependencias de Python
└── package.json       Dependencias y scripts del frontend
```

## Estado actual

La mayoría de las pantallas todavía usan datos sintéticos generados en `src/data/synthetic.ts`. La integración con el backend se hará de forma incremental, empezando por el recurso de zonas.
