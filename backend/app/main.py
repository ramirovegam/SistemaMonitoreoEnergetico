from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SIMET API",
    description="API REST para HyperDataSynthetic",
    version="1.0.0"
)

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


@app.get("/")
def inicio():
    return {
        "message": "Backend SIMET funcionando"
    }


@app.get("/api/test")
def test():
    return {
        "status": "ok",
        "message": "Frontend y Backend pueden comunicarse"
    }