from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas


def get_status(product: models.Product) -> str:
    if product.quantidade == 0:
        return "zero"
    if product.quantidade <= (product.minimo or 5):
        return "low"
    return "ok"


def to_out(product: models.Product) -> schemas.ProductOut:
    return schemas.ProductOut(
        id=product.id,
        nome=product.nome,
        codigo=product.codigo,
        categoria=product.categoria,
        unidade=product.unidade,
        quantidade=product.quantidade,
        minimo=product.minimo,
        preco_custo=product.preco_custo,
        preco_venda=product.preco_venda,
        fornecedor=product.fornecedor,
        descricao=product.descricao,
        status=get_status(product),
        criado_em=product.criado_em,
        atualizado_em=product.atualizado_em,
    )


def get_product(db: Session, product_id: str) -> Optional[models.Product]:
    return db.query(models.Product).filter(models.Product.id == product_id).first()


def get_product_by_codigo(db: Session, codigo: str) -> Optional[models.Product]:
    return db.query(models.Product).filter(func.lower(models.Product.codigo) == codigo.lower()).first()


def list_products(
    db: Session,
    search: str = "",
    categoria: str = "",
    status_filter: str = "",
):
    query = db.query(models.Product)

    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            func.lower(models.Product.nome).like(like)
            | func.lower(models.Product.codigo).like(like)
            | func.lower(models.Product.categoria).like(like)
            | func.lower(models.Product.fornecedor).like(like)
        )

    if categoria:
        query = query.filter(models.Product.categoria == categoria)

    products = query.order_by(models.Product.criado_em.desc()).all()

    if status_filter:
        products = [p for p in products if get_status(p) == status_filter]

    return products


def create_product(db: Session, data: schemas.ProductCreate) -> models.Product:
    product = models.Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product: models.Product, data: schemas.ProductUpdate) -> models.Product:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product: models.Product) -> None:
    db.delete(product)
    db.commit()


def get_categorias(db: Session) -> list[str]:
    rows = db.query(models.Product.categoria).distinct().all()
    return sorted({r[0] for r in rows if r[0]})


# ── USERS ─────────────────────────────────────────────
def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, username: str, hashed_password: str) -> models.User:
    user = models.User(username=username, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
