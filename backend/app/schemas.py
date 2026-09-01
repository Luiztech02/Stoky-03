from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── AUTH ──────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=100)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── PRODUCT ───────────────────────────────────────────
class ProductBase(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    codigo: str = Field(min_length=1, max_length=60)
    categoria: str = Field(min_length=1, max_length=60)
    unidade: str = "un"
    quantidade: int = Field(ge=0)
    minimo: int = Field(default=5, ge=0)
    preco_custo: float = Field(default=0.0, ge=0)
    preco_venda: float = Field(default=0.0, ge=0)
    fornecedor: str = ""
    descricao: str = ""


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    """Todos os campos opcionais — permite atualização parcial (PATCH-like via PUT)."""
    nome: Optional[str] = Field(default=None, min_length=1, max_length=200)
    codigo: Optional[str] = Field(default=None, min_length=1, max_length=60)
    categoria: Optional[str] = Field(default=None, min_length=1, max_length=60)
    unidade: Optional[str] = None
    quantidade: Optional[int] = Field(default=None, ge=0)
    minimo: Optional[int] = Field(default=None, ge=0)
    preco_custo: Optional[float] = Field(default=None, ge=0)
    preco_venda: Optional[float] = Field(default=None, ge=0)
    fornecedor: Optional[str] = None
    descricao: Optional[str] = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    criado_em: datetime
    atualizado_em: datetime


# ── DASHBOARD ─────────────────────────────────────────
class DashboardStats(BaseModel):
    total_produtos: int
    categorias_ativas: int
    unidades_em_estoque: int
    valor_total: float
    produtos_sem_estoque: int
    produtos_estoque_baixo: int


class CategoriaCount(BaseModel):
    categoria: str
    total: int
