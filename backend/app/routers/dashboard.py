from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/stats", summary="KPIs gerais do estoque")
def stats(db: Session = Depends(get_db)):
    produtos = crud.list_products(db)
    total_qty = sum(p.quantidade for p in produtos)
    valor_total = sum((p.preco_venda or 0) * p.quantidade for p in produtos)
    categorias = {p.categoria for p in produtos}
    sem_estoque = sum(1 for p in produtos if crud.get_status(p) == "zero")
    estoque_baixo = sum(1 for p in produtos if crud.get_status(p) == "low")

    return {
        "total_produtos": len(produtos),
        "categorias_ativas": len(categorias),
        "unidades_em_estoque": total_qty,
        "valor_total": round(valor_total, 2),
        "produtos_sem_estoque": sem_estoque,
        "produtos_estoque_baixo": estoque_baixo,
    }


@router.get("/categorias", summary="Distribuição de produtos por categoria (para o gráfico donut)")
def categorias(db: Session = Depends(get_db)):
    produtos = crud.list_products(db)
    counts = Counter(p.categoria for p in produtos)
    return [{"categoria": cat, "total": total} for cat, total in counts.most_common()]
