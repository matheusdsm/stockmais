const API_URL = '';

export const api = {
  async login(username, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao fazer login');
    }
    return res.json();
  },

  async getUsuarios(page = 1, limit = 5) {
    const res = await fetch(`${API_URL}/usuarios?page=${page}&limit=${limit}`);
    return res.json();
  },

  async criarUsuario(data, userRole) {
    const res = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, role: data.role, usuario_role: userRole })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    return res.json();
  },

  async atualizarUsuario(id, data, usuarioId, userRole) {
    const res = await fetch(`${API_URL}/usuarios?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, usuario_id: usuarioId, usuario_role: userRole, new_role: data.role })
    });
    return res.json();
  },

  async desativarUsuario(id, usuarioId, userRole) {
    const res = await fetch(`${API_URL}/usuarios?id=${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, usuario_role: userRole })
    });
    return res.json();
  },

  async getProdutos(search = '', page = 1, limit = 10) {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    const res = await fetch(`${API_URL}/produtos?${params}`);
    return res.json();
  },

  async getProduto(id) {
    const res = await fetch(`${API_URL}/produtos?id=${id}`);
    return res.json();
  },

  async criarProduto(data, usuarioId, userRole) {
    const res = await fetch(`${API_URL}/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, usuario_id: usuarioId, usuario_role: userRole })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    return res.json();
  },

  async atualizarProduto(id, data, usuarioId, userRole) {
    const res = await fetch(`${API_URL}/produtos?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, usuario_id: usuarioId, usuario_role: userRole })
    });
    return res.json();
  },

  async excluirProduto(id, usuarioId, userRole) {
    const res = await fetch(`${API_URL}/produtos?id=${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, usuario_role: userRole })
    });
    return res.json();
  },

  async restaurarProduto(id, usuarioId, userRole) {
    const res = await fetch(`${API_URL}/produtos?action=restore&id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, usuario_role: userRole })
    });
    return res.json();
  },

  async getProdutosExcluidos() {
    const res = await fetch(`${API_URL}/produtos?action=excluidos`);
    return res.json();
  },

  async reativarUsuario(id, usuarioId, userRole) {
    const res = await fetch(`${API_URL}/usuarios?action=restore&id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, usuario_role: userRole })
    });
    return res.json();
  },

  async getUsuariosInativos() {
    const res = await fetch(`${API_URL}/usuarios?action=inativos`);
    return res.json();
  },

  async criarMovimentacao(data, userRole) {
    const res = await fetch(`${API_URL}/movimentacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, usuario_role: userRole })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    return res.json();
  },

  async getMovimentacoes(filters = {}, page = 1, limit = 10) {
    const params = new URLSearchParams({ page, limit, ...filters });
    const res = await fetch(`${API_URL}/movimentacoes?${params}`);
    return res.json();
  },

  async getLogs(filters = {}, page = 1, limit = 30) {
    const params = new URLSearchParams({ page, limit, ...filters });
    const res = await fetch(`${API_URL}/logs?${params}`);
    return res.json();
  },

  async exportarLogs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_URL}/logs?action=export&${params}`);
    return res.blob();
  },

  async getDashboard() {
    const res = await fetch(`${API_URL}/dashboard`);
    return res.json();
  }
};