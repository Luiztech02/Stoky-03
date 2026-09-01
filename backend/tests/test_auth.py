def test_register_new_user(client):
    resp = client.post("/api/auth/register", json={"username": "joao", "password": "senha123"})
    assert resp.status_code == 201
    assert "access_token" in resp.json()


def test_register_duplicate_username_fails(client):
    client.post("/api/auth/register", json={"username": "joao", "password": "senha123"})
    resp = client.post("/api/auth/register", json={"username": "joao", "password": "outrasenha"})
    assert resp.status_code == 400


def test_login_with_correct_credentials(client):
    client.post("/api/auth/register", json={"username": "maria", "password": "senha123"})
    resp = client.post("/api/auth/login", data={"username": "maria", "password": "senha123"})
    assert resp.status_code == 200
    assert resp.json()["token_type"] == "bearer"


def test_login_with_wrong_password_fails(client):
    client.post("/api/auth/register", json={"username": "maria", "password": "senha123"})
    resp = client.post("/api/auth/login", data={"username": "maria", "password": "errada"})
    assert resp.status_code == 401


def test_products_endpoint_requires_auth(client):
    resp = client.get("/api/produtos")
    assert resp.status_code == 401
