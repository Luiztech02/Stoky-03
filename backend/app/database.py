"""
Configuração do banco de dados.

Usa SQLite por padrão (arquivo local, zero configuração). Se quiser trocar
para PostgreSQL no futuro, basta definir a variável de ambiente DATABASE_URL,
por exemplo:

    DATABASE_URL=postgresql://user:password@localhost:5432/stocksys

Nenhuma outra parte do código precisa mudar — é a vantagem de usar SQLAlchemy
como camada de abstração sobre o banco.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./stocksys.db")

# connect_args só é necessário para SQLite (evita erro de thread do FastAPI)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency do FastAPI: abre uma sessão por requisição e sempre fecha no final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
