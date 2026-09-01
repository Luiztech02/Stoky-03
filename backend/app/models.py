import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, Float, DateTime
from .database import Base


def gen_id() -> str:
    return uuid.uuid4().hex[:12]


def now() -> datetime:
    return datetime.now(timezone.utc)


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=gen_id)
    nome = Column(String, nullable=False)
    codigo = Column(String, nullable=False, unique=True, index=True)
    categoria = Column(String, nullable=False, index=True)
    unidade = Column(String, default="un")
    quantidade = Column(Integer, nullable=False, default=0)
    minimo = Column(Integer, default=5)
    preco_custo = Column(Float, default=0.0)
    preco_venda = Column(Float, default=0.0)
    fornecedor = Column(String, default="")
    descricao = Column(String, default="")
    criado_em = Column(DateTime(timezone=True), default=now)
    atualizado_em = Column(DateTime(timezone=True), default=now, onupdate=now)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    username = Column(String, nullable=False, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    criado_em = Column(DateTime(timezone=True), default=now)
