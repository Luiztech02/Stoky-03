"""
Cria o usuário administrador padrão (se ainda não existir).

Uso:
    python seed.py
    python seed.py meuusuario minhasenha123
"""
import sys

from app.database import Base, SessionLocal, engine
from app import crud
from app.security import hash_password

DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "admin123"


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    username = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_USERNAME
    password = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_PASSWORD

    if crud.get_user_by_username(db, username):
        print(f"⚠ Usuário '{username}' já existe. Nada a fazer.")
        return

    crud.create_user(db, username, hash_password(password))
    print(f"✓ Usuário '{username}' criado com sucesso.")
    if username == DEFAULT_USERNAME and password == DEFAULT_PASSWORD:
        print("  ⚠ Troque a senha padrão antes de expor essa API publicamente.")


if __name__ == "__main__":
    main()
