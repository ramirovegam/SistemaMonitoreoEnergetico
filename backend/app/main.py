from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.zonas import router as zonas_router
from .routers.servicios import router as servicios_router
from .routers.medidores import router as medidores_router
from .routers.alertas import router as alertas_router
from .routers.tarifas import router as tarifas_router
from .routers.analisis_energetico import router as analisis_energetico_router
from .routers.historial_lecturas import (
    router as historial_lecturas_router,
)
from .routers.dashboard import (
    router as dashboard_router,
)
from .routers.calendario import router as calendario_router


app = FastAPI(
    title="SIMET API",
    description="API del sistema de monitoreo energético",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8443",
        "http://127.0.0.1:8443",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(zonas_router)
app.include_router(servicios_router)
app.include_router(medidores_router)
app.include_router(alertas_router)
app.include_router(tarifas_router)
app.include_router(analisis_energetico_router)
app.include_router(
    historial_lecturas_router,
)
app.include_router(dashboard_router)
app.include_router(
    calendario_router,
    prefix="/api",
)

@app.get("/")
def inicio():
    return {
        "mensaje": "API SIMET funcionando",
    }