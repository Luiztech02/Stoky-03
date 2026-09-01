/**
 * STOCKSYS — app.js
 * Lógica principal do sistema de estoque.
 * Agora consome a API REST (FastAPI + SQLite) em vez de localStorage.
 * Depende de config.js e auth.js (carregados antes deste arquivo).
 */

/* ══════════════════════════════════════════
   MAPEAMENTO DE CAMPOS (frontend camelCase <-> API snake_case)
══════════════════════════════════════════ */
function toApiPayload(p) {
  return {
    nome: p.nome,
    codigo: p.codigo,
    categoria: p.categoria,
    unidade: p.unidade || 'un',
    quantidade: Number(p.quantidade) || 0,
    minimo: Number(p.minimo) || 5,
    preco_custo: Number(p.precoCusto) || 0,
    preco_venda: Number(p.precoVenda) || 0,
    fornecedor: p.fornecedor || '',
    descricao: p.descricao || '',
  };
}

function fromApi(p) {
  return {
    id: p.id,
    nome: p.nome,
    codigo: p.codigo,
    categoria: p.categoria,
    unidade: p.unidade,
    quantidade: p.quantidade,
    minimo: p.minimo,
    precoCusto: p.preco_custo,
    precoVenda: p.preco_venda,
    fornecedor: p.fornecedor,
    descricao: p.descricao,
    status: p.status, // já calculado pela API: 'ok' | 'low' | 'zero'
    criadoEm: p.criado_em,
    atualizadoEm: p.atualizado_em,
  };
}

/* ══════════════════════════════════════════
   API — chamadas HTTP
══════════════════════════════════════════ */
async function apiListProducts({ search = '', categoria = '', status = '' } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (categoria) params.set('categoria', categoria);
  if (status) params.set('status', status);
  const data = await apiJson(`/api/produtos?${params.toString()}`);
  return data.map(fromApi);
}

async function apiGetStats() {
  return apiJson('/api/dashboard/stats');
}

async function apiGetCategoriaBreakdown() {
  return apiJson('/api/dashboard/categorias');
}

async function apiCreateProduct(payload) {
  return apiJson('/api/produtos', { method: 'POST', body: JSON.stringify(toApiPayload(payload)) });
}

async function apiUpdateProduct(id, payload) {
  return apiJson(`/api/produtos/${id}`, { method: 'PUT', body: JSON.stringify(toApiPayload(payload)) });
}

async function apiDeleteProduct(id) {
  await apiFetch(`/api/produtos/${id}`, { method: 'DELETE' });
}

/* ══════════════════════════════════════════
   NAVBAR — usuário logado / logout
══════════════════════════════════════════ */
function initNavbarSession() {
  const statusEl = document.querySelector('.nav-status');
  if (!statusEl) return;
  const user = getUsername();
  statusEl.insertAdjacentHTML('beforeend', `
    <span class="nav-sep">|</span>
    <span class="status-text">${esc(user || 'usuário')}</span>
    <button class="btn-mini nav-logout" id="btn-logout" type="button">SAIR</button>
  `);
  document.getElementById('btn-logout').addEventListener('click', logout);
}

/* ══════════════════════════════════════════
   HOME PAGE — Dashboard
══════════════════════════════════════════ */
async function initHome() {
  if (!document.getElementById('stat-total')) return;

  try {
    await Promise.all([
      updateHomeStats(),
      renderHomeProductList(),
      renderCategoryChart(),
    ]);
    animateCounters();
  } catch (err) {
    console.error(err);
  }
}

async function updateHomeStats() {
  const stats = await apiGetStats();
  document.getElementById('stat-total').textContent = stats.total_produtos;
  document.getElementById('stat-categorias').textContent = stats.categorias_ativas;
  document.getElementById('stat-estoque').textContent = stats.unidades_em_estoque;
  document.getElementById('stat-valor').textContent =
    'R$ ' + stats.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const alertEl = document.getElementById('alert-low');
  if (alertEl) {
    if (stats.produtos_sem_estoque > 0) alertEl.textContent = `${stats.produtos_sem_estoque} produto(s) sem estoque`;
    else if (stats.produtos_estoque_baixo > 0) alertEl.textContent = `${stats.produtos_estoque_baixo} produto(s) com estoque baixo`;
    else alertEl.textContent = 'Estoque dentro do esperado';
  }
}

function animateCounters() {
  document.querySelectorAll('.stat-value').forEach(el => {
    el.style.opacity = 0;
    setTimeout(() => {
      el.style.transition = 'opacity 0.4s';
      el.style.opacity = 1;
    }, 200);
  });
}

async function renderHomeProductList() {
  const container = document.getElementById('home-product-list');
  if (!container) return;

  const products = (await apiListProducts()).slice(0, 5);

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">◌</span>
        <p>Nenhum produto cadastrado ainda.</p>
        <a href="registro.html" class="btn-mini">Cadastrar agora</a>
      </div>`;
    return;
  }

  container.innerHTML = products.map(p => {
    const statusColor = { ok: '#00ff99', low: '#ffb700', zero: '#ff3a5e' }[p.status];
    return `
      <div class="product-row">
        <span class="prod-name">${esc(p.nome)}</span>
        <span class="prod-code">${esc(p.codigo)}</span>
        <span class="prod-cat">${esc(p.categoria)}</span>
        <span class="prod-qty" style="color:${statusColor}">${p.quantidade} ${p.unidade || 'un'}</span>
        <span class="badge badge-${p.status}">${{ ok: 'OK', low: 'BAIXO', zero: 'ZERO' }[p.status]}</span>
      </div>`;
  }).join('');
}

async function renderCategoryChart() {
  const canvas = document.getElementById('chart-categorias');
  if (!canvas) return;

  const breakdown = await apiGetCategoriaBreakdown();
  if (!breakdown.length) { canvas.style.display = 'none'; return; }

  const labels = breakdown.map(b => b.categoria);
  const values = breakdown.map(b => b.total);
  const colors = ['#00d4ff', '#7b2fff', '#00ff99', '#ffb700', '#ff3a5e', '#ff6b35', '#a0f0ff'];

  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.parentElement.offsetWidth - 48;
  const H = canvas.height = 160;
  const cx = W / 2, cy = H / 2 - 10, r = Math.min(cx, cy) - 10;

  ctx.clearRect(0, 0, W, H);
  const total = values.reduce((a, b) => a + b, 0);
  let startAngle = -Math.PI / 2;

  values.forEach((v, i) => {
    const slice = (v / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.shadowColor = colors[i % colors.length];
    ctx.shadowBlur = 8;
    ctx.fill();
    startAngle += slice;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.52, 0, 2 * Math.PI);
  ctx.fillStyle = '#0b1525';
  ctx.shadowBlur = 0;
  ctx.fill();

  ctx.fillStyle = '#00d4ff';
  ctx.font = `bold 18px 'Orbitron', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 4);
  ctx.fillStyle = '#4a6a8a';
  ctx.font = `10px 'Share Tech Mono', monospace`;
  ctx.fillText('PRODUTOS', cx, cy + 18);

  const legend = document.getElementById('chart-legend');
  if (legend) {
    legend.innerHTML = labels.map((l, i) => `
      <div class="legend-item">
        <div class="legend-color" style="background:${colors[i % colors.length]}"></div>
        <span>${esc(l)} (${values[i]})</span>
      </div>`).join('');
  }
}

/* ══════════════════════════════════════════
   REGISTRO PAGE — CRUD
══════════════════════════════════════════ */
let deleteTarget = null;
let searchDebounceTimer = null;

function initRegistro() {
  const form = document.getElementById('product-form');
  if (!form) return;

  renderTable();
  populateCategoryFilter();

  form.addEventListener('submit', handleSubmit);
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(renderTable, 250);
  });
  document.getElementById('filter-categoria').addEventListener('change', renderTable);
  document.getElementById('filter-status').addEventListener('change', renderTable);
}

async function handleSubmit(e) {
  e.preventDefault();
  const msg = document.getElementById('form-msg');
  msg.className = 'form-msg';

  const nome = val('prod-nome').trim();
  const codigo = val('prod-codigo').trim();
  const categoria = val('prod-categoria');
  const quantidade = val('prod-quantidade');

  if (!nome || !codigo || !categoria || quantidade === '') {
    showMsg(msg, 'error', '⚠ Preencha todos os campos obrigatórios (*).');
    return;
  }

  const editId = val('edit-id');
  const payload = buildProduct();

  try {
    if (editId) {
      await apiUpdateProduct(editId, payload);
      showMsg(msg, 'success', '✓ Produto atualizado com sucesso!');
      cancelEdit();
    } else {
      await apiCreateProduct(payload);
      showMsg(msg, 'success', '✓ Produto cadastrado com sucesso!');
      e.target.reset();
    }
    await renderTable();
    await populateCategoryFilter();
  } catch (err) {
    showMsg(msg, 'error', `⚠ ${err.message}`);
  }
}

function buildProduct() {
  return {
    nome: val('prod-nome').trim(),
    codigo: val('prod-codigo').trim(),
    categoria: val('prod-categoria'),
    unidade: val('prod-unidade') || 'un',
    quantidade: Number(val('prod-quantidade')) || 0,
    minimo: Number(val('prod-minimo')) || 5,
    precoCusto: Number(val('prod-preco-custo')) || 0,
    precoVenda: Number(val('prod-preco-venda')) || 0,
    fornecedor: val('prod-fornecedor').trim(),
    descricao: val('prod-descricao').trim(),
  };
}

let currentProducts = []; // cache da última renderização, usado por editar/excluir

async function renderTable() {
  const tbody = document.getElementById('product-tbody');
  if (!tbody) return;

  const search = document.getElementById('search-input')?.value || '';
  const categoria = document.getElementById('filter-categoria')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';

  let products;
  try {
    products = await apiListProducts({ search, categoria, status });
  } catch (err) {
    console.error(err);
    return;
  }
  currentProducts = products;

  document.getElementById('table-count').textContent =
    `${products.length} produto${products.length !== 1 ? 's' : ''} encontrado${products.length !== 1 ? 's' : ''}`;

  if (!products.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><div class="empty-state"><span class="empty-icon">◌</span><p>Nenhum produto encontrado.</p></div></td></tr>`;
    return;
  }

  const statusLabelMap = { ok: 'Normal', low: 'Estoque Baixo', zero: 'Sem Estoque' };

  tbody.innerHTML = products.map(p => {
    const preco = p.precoVenda ? 'R$ ' + Number(p.precoVenda).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—';
    return `
      <tr>
        <td class="code-cell">${esc(p.codigo)}</td>
        <td>${esc(p.nome)}</td>
        <td class="cat-cell">${esc(p.categoria)}</td>
        <td>${p.quantidade} ${p.unidade || 'un'}</td>
        <td>${preco}</td>
        <td><span class="badge badge-${p.status}">${statusLabelMap[p.status]}</span></td>
        <td>
          <button class="action-btn" onclick="editProduct('${p.id}')">✏ Editar</button>
          <button class="action-btn del" onclick="confirmDelete('${p.id}', '${esc(p.nome)}')">✕ Excluir</button>
        </td>
      </tr>`;
  }).join('');
}

function editProduct(id) {
  const p = currentProducts.find(x => x.id === id);
  if (!p) return;

  setVal('edit-id', p.id);
  setVal('prod-nome', p.nome);
  setVal('prod-codigo', p.codigo);
  setVal('prod-categoria', p.categoria);
  setVal('prod-unidade', p.unidade);
  setVal('prod-quantidade', p.quantidade);
  setVal('prod-minimo', p.minimo);
  setVal('prod-preco-custo', p.precoCusto);
  setVal('prod-preco-venda', p.precoVenda);
  setVal('prod-fornecedor', p.fornecedor);
  setVal('prod-descricao', p.descricao);

  document.getElementById('form-title').textContent = 'EDITAR PRODUTO';
  document.getElementById('btn-submit').textContent = 'SALVAR ALTERAÇÕES';
  document.getElementById('btn-cancel').style.display = 'inline-flex';
  document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  document.getElementById('product-form').reset();
  setVal('edit-id', '');
  document.getElementById('form-title').textContent = 'CADASTRAR PRODUTO';
  document.getElementById('btn-submit').textContent = 'SALVAR PRODUTO';
  document.getElementById('btn-cancel').style.display = 'none';
  document.getElementById('form-msg').className = 'form-msg';
}

function confirmDelete(id, nome) {
  deleteTarget = id;
  document.getElementById('modal-msg').innerHTML = `Tem certeza que deseja remover <strong>"${esc(nome)}"</strong>?<br/>Esta ação não pode ser desfeita.`;
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('btn-confirm-delete').onclick = async () => {
    try {
      await apiDeleteProduct(deleteTarget);
    } catch (err) {
      console.error(err);
    }
    closeModal();
    await renderTable();
    await populateCategoryFilter();
  };
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  deleteTarget = null;
}

async function populateCategoryFilter() {
  const sel = document.getElementById('filter-categoria');
  if (!sel) return;
  const cats = await apiJson('/api/produtos/categorias');
  const current = sel.value;
  sel.innerHTML = '<option value="">TODAS AS CATEGORIAS</option>' +
    cats.map(c => `<option value="${esc(c)}" ${c === current ? 'selected' : ''}>${esc(c)}</option>`).join('');
}

/* ══════════════════════════════════════════
   EXPORT CSV
══════════════════════════════════════════ */
async function exportData() {
  try {
    const res = await apiFetch('/api/produtos/export/csv');
    if (!res.ok) throw new Error('Falha ao exportar');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stocksys_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Não foi possível exportar: ' + err.message);
  }
}

/* ══════════════════════════════════════════
   UTILITÁRIOS
══════════════════════════════════════════ */
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? '';
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showMsg(el, type, text) {
  el.className = `form-msg ${type}`;
  el.textContent = text;
  setTimeout(() => { el.className = 'form-msg'; }, 5000);
}

/* ══════════════════════════════════════════
   INIT — Detecta página, exige login e inicializa
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return; // redireciona para login.html se não houver sessão
  initNavbarSession();
  initHome();
  initRegistro();
});
