def make_product(**overrides):
    data = {
        "nome": "Monitor 27pol",
        "codigo": "MON-27-001",
        "categoria": "Eletrônicos",
        "unidade": "un",
        "quantidade": 15,
        "minimo": 5,
        "preco_custo": 800.0,
        "preco_venda": 1200.0,
        "fornecedor": "TechSupply Ltda",
        "descricao": "Monitor Full HD IPS 75Hz",
    }
    data.update(overrides)
    return data


def test_create_product(client, auth_headers):
    resp = client.post("/api/produtos", json=make_product(), headers=auth_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["nome"] == "Monitor 27pol"
    assert body["status"] == "ok"


def test_create_product_with_duplicate_codigo_fails(client, auth_headers):
    client.post("/api/produtos", json=make_product(), headers=auth_headers)
    resp = client.post("/api/produtos", json=make_product(nome="Outro produto"), headers=auth_headers)
    assert resp.status_code == 400


def test_list_products(client, auth_headers):
    client.post("/api/produtos", json=make_product(), headers=auth_headers)
    client.post("/api/produtos", json=make_product(codigo="TEC-002", nome="Teclado"), headers=auth_headers)

    resp = client.get("/api/produtos", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_search_filters_results(client, auth_headers):
    client.post("/api/produtos", json=make_product(), headers=auth_headers)
    client.post("/api/produtos", json=make_product(codigo="TEC-002", nome="Teclado Mecânico"), headers=auth_headers)

    resp = client.get("/api/produtos", params={"search": "teclado"}, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["nome"] == "Teclado Mecânico"


def test_status_zero_when_quantity_is_zero(client, auth_headers):
    resp = client.post("/api/produtos", json=make_product(quantidade=0), headers=auth_headers)
    assert resp.json()["status"] == "zero"


def test_status_low_when_below_minimum(client, auth_headers):
    resp = client.post("/api/produtos", json=make_product(quantidade=3, minimo=5), headers=auth_headers)
    assert resp.json()["status"] == "low"


def test_update_product(client, auth_headers):
    created = client.post("/api/produtos", json=make_product(), headers=auth_headers).json()
    resp = client.put(
        f"/api/produtos/{created['id']}",
        json={"quantidade": 50},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["quantidade"] == 50


def test_delete_product(client, auth_headers):
    created = client.post("/api/produtos", json=make_product(), headers=auth_headers).json()
    resp = client.delete(f"/api/produtos/{created['id']}", headers=auth_headers)
    assert resp.status_code == 204

    resp = client.get(f"/api/produtos/{created['id']}", headers=auth_headers)
    assert resp.status_code == 404


def test_dashboard_stats(client, auth_headers):
    client.post("/api/produtos", json=make_product(quantidade=10, preco_venda=100), headers=auth_headers)
    client.post("/api/produtos", json=make_product(codigo="TEC-002", quantidade=0, preco_venda=50), headers=auth_headers)

    resp = client.get("/api/dashboard/stats", headers=auth_headers)
    body = resp.json()
    assert body["total_produtos"] == 2
    assert body["produtos_sem_estoque"] == 1
    assert body["valor_total"] == 1000.0
