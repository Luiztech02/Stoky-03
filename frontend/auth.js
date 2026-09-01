/**
 * STOCKSYS — auth.js
 * Gerencia o token JWT e centraliza as chamadas à API.
 */
const TOKEN_KEY = 'stocksys_token';
const USERNAME_KEY = 'stocksys_username';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setSession(token, username) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username || '');
}

function getUsername() {
  return localStorage.getItem(USERNAME_KEY) || '';
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

/** Redireciona para o login se não houver sessão. Chame no topo das páginas protegidas. */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

/**
 * Wrapper de fetch que já injeta o token e trata 401 (sessão expirada) de forma
 * centralizada, redirecionando para o login.
 */
async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${window.STOCKSYS_API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    window.location.href = 'login.html';
    throw new Error('Sessão expirada');
  }

  return res;
}

/** Faz o fetch e já retorna o JSON, lançando erro com a mensagem da API em caso de falha. */
async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const detail = (data && data.detail) || 'Erro inesperado na API';
    throw new Error(detail);
  }
  return data;
}
