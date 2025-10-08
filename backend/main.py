from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="HomeTARS Backend",
    description="API backend do HomeTARS — Sci-fi Home Assistant",
    version="0.1.0",
)

# Permitir acesso do frontend (pode ajustar origens depois)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/status")
def read_status():
    return {"status": "ok", "message": "HomeTARS backend alive!"}
