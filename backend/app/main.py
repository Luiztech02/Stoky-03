from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import Base, engine
from .routers import auth, dashboard, products

# Cria as tabelas automaticamente se ainda não existirem.
# Para um projeto maior/produção, o ideal é usar Alembic (migrations versionadas)
# em vez de create_all — mas para este porte, isso mantém o setup em zero passos.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="StockSys API",
    description=(
        "API REST para o sistema de gestão de estoque StockSys. "
        "Construída com FastAPI + SQLAlchemy + SQLite, com autenticação JWT."
    ),
    version="1.0.0",
    contact={"name": "StockSys"},
)

# CORS liberado para desenvolvimento local (frontend servido em outra porta/origem).
# Em produção, restrinja allow_origins ao(s) domínio(s) real(is) do frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(dashboard.router)


@app.get("/api/health", tags=["Health"], summary="Verifica se a API está no ar")
def health():
    return {"status": "ok", "service": "stocksys-api"}
