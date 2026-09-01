import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(
    prefix="/api/produtos",
    tags=["Produtos"],
    dependencies=[Depends(get_current_user)],  # todas as rotas abaixo exigem login
)


@router.get("", response_model=list[schemas.ProductOut], summary="Lista produtos (com busca e filtros)")
def listar_produtos(
    search: str = Query("", description="Busca por nome, código, categoria ou fornecedor"),
    categoria: str = Query("", description="Filtra por categoria exata"),
    status_filter: str = Query("", alias="status", description="ok | low | zero"),
    db: Session = Depends(get_db),
):
    produtos = crud.list_products(db, search=search, categoria=categoria, status_filter=status_filter)
    return [crud.to_out(p) for p in produtos]


@router.get("/categorias", response_model=list[str], summary="Lista as categorias já cadastradas")
def listar_categorias(db: Session = Depends(get_db)):
    return crud.get_categorias(db)


@router.get("/export/csv", summary="Exporta todos os produtos em CSV (UTF-8 com BOM)")
def exportar_csv(db: Session = Depends(get_db)):
    produtos = crud.list_products(db)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "ID", "Nome", "Código", "Categoria", "Unidade", "Quantidade",
        "Estoque Mínimo", "Preço Custo", "Preço Venda", "Fornecedor",
        "Descrição", "Status", "Criado Em",
    ])
    for p in produtos:
        writer.writerow([
            p.id, p.nome, p.codigo, p.categoria, p.unidade, p.quantidade,
            p.minimo, p.preco_custo, p.preco_venda, p.fornecedor,
            p.descricao, crud.get_status(p), p.criado_em.strftime("%d/%m/%Y"),
        ])

    content = "\ufeff" + buffer.getvalue()  # BOM para o Excel reconhecer UTF-8
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=stocksys_export.csv"},
    )


@router.get("/{product_id}", response_model=schemas.ProductOut, summary="Detalhe de um produto")
def obter_produto(product_id: str, db: Session = Depends(get_db)):
    produto = crud.get_product(db, product_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return crud.to_out(produto)


@router.post("", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED, summary="Cadastra um novo produto")
def criar_produto(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    if crud.get_product_by_codigo(db, payload.codigo):
        raise HTTPException(status_code=400, detail="Já existe um produto com esse código (SKU)")
    produto = crud.create_product(db, payload)
    return crud.to_out(produto)


@router.put("/{product_id}", response_model=schemas.ProductOut, summary="Atualiza um produto existente")
def atualizar_produto(product_id: str, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    produto = crud.get_product(db, product_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if payload.codigo and payload.codigo.lower() != produto.codigo.lower():
        existente = crud.get_product_by_codigo(db, payload.codigo)
        if existente and existente.id != produto.id:
            raise HTTPException(status_code=400, detail="Já existe um produto com esse código (SKU)")

    produto = crud.update_product(db, produto, payload)
    return crud.to_out(produto)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove um produto")
def excluir_produto(product_id: str, db: Session = Depends(get_db)):
    produto = crud.get_product(db, product_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    crud.delete_product(db, produto)
