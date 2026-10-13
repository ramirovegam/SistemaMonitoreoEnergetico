## SIMET - Sistema de Monitoreo Energético

Panel web para monitorear el consumo eléctrico de hogares, medidores y zonas de Toluca como ciudad inteligente. Proyecto de la materia _Tópicos de Tecnologías de Datos_.

### Arquitectura

La aplicación se divide en tres capas que se ejecutan de forma independiente:

| Capa | Tecnología | Dirección local |
|---|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS | http://localhost:8443 |
| Backend (API) | Python, FastAPI, SQLAlchemy | http://127.0.0.1:8000 |
| Base de datos | PostgreSQL (esquema `energia`) | Definida en `DATABASE_URL` |

Flujo de una petición:

- El usuario interactúa con la interfaz en React.
- React envía una petición HTTP al backend y recibe JSON.
- FastAPI consulta PostgreSQL mediante SQLAlchemy.
- FastAPI devuelve los resultados y React actualiza la interfaz.

La documentación interactiva de la API (Swagger) está en http://127.0.0.1:8000/docs.

### Requisitos

- Python 3.10 o superior
- Node.js 20.19 o superior (requerido por Vite 8)
- PostgreSQL con el esquema `energia` creado

### Configuración

Copia la plantilla de variables de entorno y ajusta los valores:

```bash
cp .env.example .env
```

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL. El backend no arranca sin ella. |
| `VITE_API_URL` | URL base de la API que usa el frontend. |

Ejemplo:

```env
DATABASE_URL=postgresql+psycopg://usuario:password@localhost:5432/energia_hsd
VITE_API_URL=http://127.0.0.1:8000
```

Crea el esquema de la base de datos. `psql` usa la misma cadena de conexión, pero sin el prefijo `+psycopg`:

```bash
psql "postgresql://usuario:password@localhost:5432/energia_hsd" -f backend/sql/schema.sql
```

### Ejecución en desarrollo

Se necesitan dos terminales abiertas en la raíz del proyecto.

#### Terminal 1: backend

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
python -m uvicorn backend.app.main:app --reload --port 8000
```

La API queda disponible en http://127.0.0.1:8000 y Swagger en http://127.0.0.1:8000/docs.

#### Terminal 2: frontend

```bash
npm install
npm run dev
```

La interfaz queda disponible en http://localhost:8443.

### Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Verifica que el backend está activo |
| GET | `/api/test` | Prueba de comunicación con el frontend |
| GET | `/api/zonas` | Lista las zonas registradas |
| GET | `/api/zonas/{id_zona}` | Devuelve el detalle de una zona |

### Estructura del proyecto

```text
.
├── backend/
│   ├── app/
│   │   ├── models/       Modelos SQLAlchemy
│   │   ├── routers/      Endpoints de FastAPI
│   │   ├── schemas/      Esquemas de validación Pydantic
│   │   ├── database.py   Conexión y sesiones de PostgreSQL
│   │   └── main.py       Configuración principal de la API
│   └── sql/              Scripts SQL del esquema
├── src/
│   ├── components/       Páginas y componentes de la interfaz
│   ├── data/             Datos sintéticos temporales
│   └── services/         Clientes HTTP hacia la API
├── requirements.txt      Dependencias de Python
└── package.json          Dependencias y scripts del frontend
```

### Conexión del dashboard con PostgreSQL: ejemplo Zonas

La integración del módulo **Zonas** reemplaza los valores de `src/data/synthetic.ts` por información real de la tabla `energia.zona` de PostgreSQL. La conexión no se realiza directamente desde React. El frontend consume una API de FastAPI y el backend es el responsable de consultar la base de datos.

```text
PostgreSQL: energia.zona
        ↓
Modelo SQLAlchemy: backend/app/models/zona.py
        ↓
Esquema Pydantic: backend/app/schemas/zona.py
        ↓
Router FastAPI: backend/app/routers/zonas.py
        ↓
Servicio HTTP: src/services/zonasService.ts
        ↓
Interfaz React: src/components/Zones.tsx
```

#### 1. Conexión y sesión de base de datos

El archivo `backend/app/database.py` lee `DATABASE_URL`, crea el motor de SQLAlchemy y proporciona una sesión por petición mediante `get_db()`.

```python
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

La sesión se cierra al terminar cada petición, incluso si ocurre un error. Las credenciales de PostgreSQL permanecen en el backend y no se exponen al navegador.

#### 2. Modelo SQLAlchemy

El archivo `backend/app/models/zona.py` representa la tabla real `energia.zona`. Cada atributo del modelo corresponde a una columna de PostgreSQL.

```python
class Zona(Base):
    __tablename__ = "zona"
    __table_args__ = {"schema": "energia"}

    id_zona: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60), nullable=False, unique=True)
    tipo_urbano: Mapped[str] = mapped_column(String(20), nullable=False)
    superficie_km2: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
    factor_socioeconomico: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    poblacion_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    viviendas_habitadas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    grado_rezago_representativo: Mapped[str | None] = mapped_column(String(12), nullable=True)
    id_referencia: Mapped[int | None] = mapped_column(Integer, nullable=True)
```

La propiedad `__table_args__` es importante porque indica que la tabla se encuentra dentro del esquema `energia`, no en el esquema público predeterminado.

#### 3. Esquema Pydantic

El archivo `backend/app/schemas/zona.py` define la estructura JSON que la API entrega al frontend. También valida los tipos y permite convertir objetos SQLAlchemy.

```python
class ZonaResponse(BaseModel):
    id_zona: int
    nombre: str
    tipo_urbano: str
    superficie_km2: float
    factor_socioeconomico: float
    poblacion_total: int | None
    viviendas_habitadas: int | None
    grado_rezago_representativo: str | None
    id_referencia: int | None

    model_config = ConfigDict(from_attributes=True)
```

El modelo SQLAlchemy describe cómo se almacena la información. El esquema Pydantic describe cómo sale la información por la API.

#### 4. Router de FastAPI

El archivo `backend/app/routers/zonas.py` contiene los endpoints. La función `listar_zonas` obtiene una sesión con `Depends(get_db)`, consulta la tabla y devuelve los registros ordenados.

```python
router = APIRouter(prefix="/api/zonas", tags=["Zonas"])


@router.get("", response_model=list[ZonaResponse])
def listar_zonas(db: Session = Depends(get_db)):
    consulta = select(Zona).order_by(Zona.nombre.asc())
    return db.scalars(consulta).all()


@router.get("/{id_zona}", response_model=ZonaResponse)
def obtener_zona(id_zona: int, db: Session = Depends(get_db)):
    zona = db.get(Zona, id_zona)
    if zona is None:
        raise HTTPException(status_code=404, detail="La zona solicitada no existe")
    return zona
```

El router se registra en `backend/app/main.py`:

```python
from .routers.zonas import router as zonas_router

app.include_router(zonas_router)
```

FastAPI publica entonces:

- `GET /api/zonas`: devuelve todas las zonas.
- `GET /api/zonas/{id_zona}`: devuelve una zona por identificador.

#### 5. Permisos CORS

Como React y FastAPI se ejecutan en direcciones distintas durante el desarrollo, `backend/app/main.py` autoriza el origen del frontend mediante `CORSMiddleware`.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8443",
        "http://127.0.0.1:8443",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Sin esta configuración, el navegador puede bloquear la petición aunque la API y PostgreSQL estén funcionando correctamente.

#### 6. Servicio del frontend

El archivo `src/services/zonasService.ts` centraliza la comunicación con la API. La interfaz `Zona` describe el JSON esperado y `obtenerZonas()` realiza la petición HTTP.

```typescript
export interface Zona {
  id_zona: number;
  nombre: string;
  tipo_urbano: string;
  superficie_km2: number;
  factor_socioeconomico: number;
  poblacion_total: number | null;
  viviendas_habitadas: number | null;
  grado_rezago_representativo: string | null;
  id_referencia: number | null;
}

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function obtenerZonas(): Promise<Zona[]> {
  const response = await fetch(`${API_URL}/api/zonas`);

  if (!response.ok) {
    throw new Error("No se pudieron cargar las zonas");
  }

  return response.json();
}
```

El servicio evita repetir direcciones y lógica HTTP dentro de los componentes. Para cambiar la URL del backend solamente se modifica `VITE_API_URL`.

#### 7. Consumo desde React

El archivo `src/components/Zones.tsx` dejó de importar `zoneData` desde `synthetic.ts`. Ahora carga las zonas reales cuando el componente se monta.

```tsx
import { useEffect, useState } from "react";
import { obtenerZonas, type Zona } from "../services/zonasService";

const [zonas, setZonas] = useState<Zona[]>([]);
const [selectedId, setSelectedId] = useState<number | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const cargarZonas = async () => {
    try {
      const datos = await obtenerZonas();
      setZonas(datos);
      setSelectedId(datos.length > 0 ? datos[0].id_zona : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar zonas");
    } finally {
      setLoading(false);
    }
  };

  cargarZonas();
}, []);
```

React guarda la respuesta en el estado `zonas`. Cuando se selecciona una zona, el componente busca el registro correspondiente y presenta población, viviendas, superficie, factor socioeconómico, tipo urbano y grado de rezago.

También se calculan indicadores derivados sin alterar los datos de PostgreSQL:

```typescript
const densidadPoblacional =
  zona.poblacion_total !== null && zona.superficie_km2 > 0
    ? zona.poblacion_total / zona.superficie_km2
    : null;

const habitantesPorVivienda =
  zona.poblacion_total !== null &&
  zona.viviendas_habitadas !== null &&
  zona.viviendas_habitadas > 0
    ? zona.poblacion_total / zona.viviendas_habitadas
    : null;
```

#### 8. Resultado de la integración

Al abrir el módulo Zonas ocurre lo siguiente:

1. `Zones.tsx` ejecuta `obtenerZonas()`.
2. `zonasService.ts` solicita `GET /api/zonas`.
3. FastAPI recibe la petición en `routers/zonas.py`.
4. SQLAlchemy consulta `energia.zona` mediante el modelo `Zona`.
5. Pydantic transforma y valida los registros.
6. FastAPI devuelve un arreglo JSON.
7. React guarda el resultado y vuelve a renderizar el dashboard.

De esta forma, nombres como **Toluca de Lerdo**, **San Pablo Autopan** y las demás zonas registradas provienen de PostgreSQL. El archivo `synthetic.ts` se conserva temporalmente porque otros módulos todavía pueden utilizarlo, pero el módulo Zonas ya no depende de datos simulados.

#### 9. Prueba y diagnóstico

Antes de revisar el frontend se debe comprobar el endpoint:

```text
http://127.0.0.1:8000/api/zonas
```

También puede utilizarse Swagger:

```text
http://127.0.0.1:8000/docs
```

Si el endpoint devuelve JSON, la conexión PostgreSQL → FastAPI funciona. Si el endpoint funciona pero el dashboard no carga, se debe revisar `VITE_API_URL`, CORS y la consola del navegador.

### Estado actual

La integración con PostgreSQL se realiza de forma incremental. El módulo Zonas ya consume información real de `energia.zona` mediante FastAPI. Otros módulos todavía pueden utilizar datos sintéticos de `src/data/synthetic.ts` hasta que se implementen sus modelos, esquemas, routers y servicios correspondientes.
