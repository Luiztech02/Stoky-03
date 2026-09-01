from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.post(
    "/register",
    response_model=schemas.Token,
    status_code=status.HTTP_201_CREATED,
    summary="Cria um novo usuário e já retorna o token de acesso",
)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_username(db, payload.username):
        raise HTTPException(status_code=400, detail="Esse nome de usuário já está em uso")

    user = crud.create_user(db, payload.username, hash_password(payload.password))
    token = create_access_token(subject=user.username)
    return schemas.Token(access_token=token)


@router.post(
    "/login",
    response_model=schemas.Token,
    summary="Autentica e retorna um token JWT (OAuth2 password flow)",
)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.username)
    return schemas.Token(access_token=token)
