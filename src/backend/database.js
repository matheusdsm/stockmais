import initSqlJs from 'sql.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/stockmais.db');
const dataDir = path.join(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;
let SQL;

async function initDatabase() {
  SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('funcionário', 'supervisor', 'gerente')) NOT NULL,
      nome_completo TEXT NOT NULL,
      ativo INTEGER DEFAULT 1,
      created_at TEXT,
      excluido_por INTEGER REFERENCES usuarios(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT,
      quantidade INTEGER DEFAULT 0,
      preco_unitario REAL DEFAULT 0,
      localizacao TEXT,
      categoria TEXT,
      deleted INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      usuario_id INTEGER REFERENCES usuarios(id),
      excluido_por INTEGER REFERENCES usuarios(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS movimentacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER REFERENCES produtos(id),
      tipo TEXT CHECK(tipo IN ('entrada', 'saida', 'ajuste')) NOT NULL,
      quantidade INTEGER NOT NULL,
      motivo TEXT,
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      acao TEXT NOT NULL,
      tabela TEXT NOT NULL,
      registro_id INTEGER,
      dados_anteriores TEXT,
      dados_novos TEXT,
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at TEXT
    )
  `);

  try {
    db.run(`ALTER TABLE usuarios ADD COLUMN excluido_por INTEGER REFERENCES usuarios(id)`);
  } catch (e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT,
      quantidade INTEGER DEFAULT 0,
      preco_unitario REAL DEFAULT 0,
      localizacao TEXT,
      categoria TEXT,
      deleted INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      usuario_id INTEGER REFERENCES usuarios(id),
      excluido_por INTEGER REFERENCES usuarios(id)
    )
  `);

  // Adicionar colunas se não existirem (para bancos existentes)
  try {
    db.run(`ALTER TABLE produtos ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)`);
  } catch (e) {}
  
  try {
    db.run(`ALTER TABLE produtos ADD COLUMN excluido_por INTEGER REFERENCES usuarios(id)`);
  } catch (e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS movimentacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER REFERENCES produtos(id),
      tipo TEXT CHECK(tipo IN ('entrada', 'saida', 'ajuste')) NOT NULL,
      quantidade INTEGER NOT NULL,
      motivo TEXT,
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      acao TEXT NOT NULL,
      tabela TEXT NOT NULL,
      registro_id INTEGER,
      dados_anteriores TEXT,
      dados_novos TEXT,
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at TEXT
    )
  `);

  const result = db.exec('SELECT COUNT(*) as count FROM usuarios');
  if (result.length === 0 || result[0].values[0][0] === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT INTO usuarios (username, password_hash, role, nome_completo, created_at) VALUES (?, ?, ?, ?, ?)`, ['admin', hash, 'gerente', 'Administrador', getBrasiliaDateTime()]);
  }
  
  saveDb();
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function getBrasiliaDateTime() {
  const now = new Date();
  now.setHours(now.getHours() - 3);
  return now.toISOString().replace('T', ' ').slice(0, 19);
}

function gerarSKU(produto) {
  const categoria = produto.categoria?.substring(0, 3).toUpperCase() || 'GEN';
  const letras = produto.nome.substring(0, 2).toUpperCase();
  const now = new Date();
  now.setHours(now.getHours() - 3);
  const timestamp = now.getTime().toString().slice(-4);
  return `${categoria}-${letras}-${timestamp}`;
}

function log(acao, tabela, registroId, dadosAnteriores, dadosNovos, usuarioId) {
  db.run(`INSERT INTO logs (acao, tabela, registro_id, dados_anteriores, dados_novos, usuario_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [acao, tabela, registroId, dadosAnteriores ? JSON.stringify(dadosAnteriores) : null, dadosNovos ? JSON.stringify(dadosNovos) : null, usuarioId, getBrasiliaDateTime()]);
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return db.getRowsModified();
}

export const usuarios = {
  criar(data) {
    const hash = bcrypt.hashSync(data.password, 10);
    db.run(`INSERT INTO usuarios (username, password_hash, role, nome_completo, created_at) VALUES (?, ?, ?, ?, ?)`, [data.username, hash, data.role, data.nome_completo, getBrasiliaDateTime()]);
    const id = queryOne('SELECT last_insert_rowid() as id').id;
    log('CREATE', 'usuarios', id, null, data, data.usuario_id);
    return { id, ...data };
  },

  login(username, password) {
    // Login especial para visitante (sem necessidade de senha)
    if (username === 'visitante' && password === 'visitante') {
      return { id: 0, username: 'visitante', role: 'visitante', nome_completo: 'Visitante', ativo: 1 };
    }
    
    const user = queryOne('SELECT * FROM usuarios WHERE username = ? AND ativo = 1', [username]);
    if (!user) return null;
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return null;
    const { password_hash, ...userData } = user;
    return userData;
  },

  listar(ativo = true) {
    return queryAll('SELECT id, username, role, nome_completo, ativo, created_at FROM usuarios WHERE ativo = ?', [ativo ? 1 : 0]);
  },

  listarTodos(page = 1, limit = 5) {
    let sql = 'SELECT id, username, role, nome_completo, ativo, created_at FROM usuarios';
    
    const countSql = 'SELECT COUNT(*) as total FROM usuarios';
    const total = queryOne(countSql)?.total || 0;
    
    const offset = (page - 1) * limit;
    sql += ` ORDER BY CASE role WHEN 'gerente' THEN 1 WHEN 'supervisor' THEN 2 WHEN 'funcionário' THEN 3 END, nome_completo LIMIT ${limit} OFFSET ${offset}`;
    
    return { data: queryAll(sql), total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  atualizar(id, data, usuarioId) {
    const current = queryOne('SELECT * FROM usuarios WHERE id = ?', [id]);
    const fields = [];
    const values = [];
    if (data.username) { fields.push('username = ?'); values.push(data.username); }
    if (data.password) { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(data.password, 10)); }
    if (data.role) { fields.push('role = ?'); values.push(data.role); }
    if (data.nome_completo) { fields.push('nome_completo = ?'); values.push(data.nome_completo); }
    values.push(id);
    if (fields.length > 0) {
      run(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
      log('UPDATE', 'usuarios', id, current, data, usuarioId);
    }
    return { id, ...data };
  },

  desativar(id, usuarioId) {
    run('UPDATE usuarios SET ativo = 0, excluido_por = ? WHERE id = ?', [usuarioId, id]);
    log('DELETE', 'usuarios', id, null, { ativo: 0 }, usuarioId);
    return { success: true };
  },

  reativar(id, usuarioId) {
    const current = queryOne('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (!current) return { error: 'Usuário não encontrado' };
    run('UPDATE usuarios SET ativo = 1, excluido_por = NULL WHERE id = ?', [id]);
    log('RESTORE', 'usuarios', id, { ativo: 0 }, { ativo: 1 }, usuarioId);
    return { success: true };
  },

  listarInativos() {
    return queryAll(`SELECT u.*, ex.username as excluido_por_username, ex.nome_completo as excluido_por_nome FROM usuarios u LEFT JOIN usuarios ex ON u.excluido_por = ex.id WHERE u.ativo = 0`);
  }
};

export const produtos = {
  criar(data) {
    const sku = gerarSKU(data);
    db.run(`INSERT INTO produtos (sku, nome, descricao, quantidade, preco_unitario, localizacao, categoria, usuario_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sku, data.nome, data.descricao || null, data.quantidade || 0, data.preco_unitario || 0, data.localizacao || null, data.categoria || null, data.usuario_id || null, getBrasiliaDateTime(), getBrasiliaDateTime()]);
    const id = queryOne('SELECT last_insert_rowid() as id').id;
    log('CREATE', 'produtos', id, null, { ...data, sku }, data.usuario_id);
    return { id, sku, ...data };
  },

  listar(search = '', page = 1, limit = 10) {
    let sql = 'SELECT * FROM produtos WHERE deleted = 0';
    const params = [];
    if (search) {
      sql += ' AND (nome LIKE ? OR sku LIKE ? OR categoria LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const total = queryOne(countSql, params)?.total || 0;
    
    sql += ' ORDER BY created_at DESC';
    const offset = (page - 1) * limit;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const produtos = queryAll(sql, params);
    
    for (const p of produtos) {
      if (p.usuario_id) {
        const usuario = queryOne('SELECT username, nome_completo, role FROM usuarios WHERE id = ?', [p.usuario_id]);
        if (usuario) {
          p.usuario_username = usuario.username;
          p.usuario_nome = usuario.nome_completo;
          p.usuario_role = usuario.role;
        }
      }
    }
    return { data: produtos, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  get(id) {
    return queryOne('SELECT * FROM produtos WHERE id = ? AND deleted = 0', [id]);
  },

  atualizar(id, data, usuarioId) {
    const current = this.get(id);
    const fields = [];
    const values = [];
    if (data.nome) { fields.push('nome = ?'); values.push(data.nome); }
    if (data.descricao !== undefined) { fields.push('descricao = ?'); values.push(data.descricao); }
    if (data.quantidade !== undefined) { fields.push('quantidade = ?'); values.push(data.quantidade); }
    if (data.preco_unitario !== undefined) { fields.push('preco_unitario = ?'); values.push(data.preco_unitario); }
    if (data.localizacao !== undefined) { fields.push('localizacao = ?'); values.push(data.localizacao); }
    if (data.categoria !== undefined) { fields.push('categoria = ?'); values.push(data.categoria); }
    fields.push('updated_at = ?');
    values.push(getBrasiliaDateTime());
    values.push(id);
    run(`UPDATE produtos SET ${fields.join(', ')} WHERE id = ?`, values);
    log('UPDATE', 'produtos', id, current, data, usuarioId);
    return { id, ...data };
  },

  excluir(id, usuarioId) {
    run('UPDATE produtos SET deleted = 1, excluido_por = ? WHERE id = ?', [usuarioId, id]);
    log('DELETE', 'produtos', id, null, { deleted: 1 }, usuarioId);
    return { success: true };
  },

  restaurar(id, usuarioId) {
    const current = this.get(id, true);
    if (!current) return { error: 'Produto não encontrado' };
    run('UPDATE produtos SET deleted = 0, excluido_por = NULL WHERE id = ?', [id]);
    log('RESTORE', 'produtos', id, { deleted: 1 }, { deleted: 0 }, usuarioId);
    return { success: true };
  },

  listarExcluidos() {
    return queryAll(`SELECT p.*, u.username as excluido_por_username, u.nome_completo as excluido_por_nome FROM produtos p LEFT JOIN usuarios u ON p.excluido_por = u.id WHERE p.deleted = 1 ORDER BY p.updated_at DESC`);
  },

  get(id, includeDeleted = false) {
    const sql = includeDeleted 
      ? 'SELECT * FROM produtos WHERE id = ?' 
      : 'SELECT * FROM produtos WHERE id = ? AND deleted = 0';
    return queryOne(sql, [id]);
  }
};

export const movimentacoes = {
  criar(data) {
    db.run(`INSERT INTO movimentacoes (produto_id, tipo, quantidade, motivo, usuario_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [data.produto_id, data.tipo, data.quantidade, data.motivo || null, data.usuario_id, getBrasiliaDateTime()]);
    const id = queryOne('SELECT last_insert_rowid() as id').id;

    const produto = produtos.get(data.produto_id);
    let novaQuantidade = produto.quantidade;
    if (data.tipo === 'entrada') novaQuantidade += data.quantidade;
    else if (data.tipo === 'saida') novaQuantidade -= data.quantidade;
    else if (data.tipo === 'ajuste') novaQuantidade = data.quantidade;

    run('UPDATE produtos SET quantidade = ?, updated_at = ? WHERE id = ?', [novaQuantidade, getBrasiliaDateTime(), data.produto_id]);
    log(data.tipo, 'movimentacoes', id, null, data, data.usuario_id);
    return { id, nova_quantidade: novaQuantidade };
  },

  listar(filters = {}, page = 1, limit = 10) {
    let sql = `SELECT m.*, p.nome as produto_nome, p.sku, u.username as usuario_username, u.nome_completo as usuario_nome, u.role as usuario_role FROM movimentacoes m LEFT JOIN produtos p ON m.produto_id = p.id LEFT JOIN usuarios u ON m.usuario_id = u.id WHERE 1=1`;
    const params = [];
    if (filters.produto_id) { sql += ' AND m.produto_id = ?'; params.push(filters.produto_id); }
    if (filters.tipo) { sql += ' AND m.tipo = ?'; params.push(filters.tipo); }
    
    // Tratamento especial: quando data_inicio === data_fim, usar date() para comparar apenas data
    if (filters.data_inicio && filters.data_fim && filters.data_inicio === filters.data_fim) {
      sql += ' AND date(m.created_at) = ?';
      params.push(filters.data_inicio);
    } else {
      if (filters.data_inicio) { sql += ' AND m.created_at >= ?'; params.push(filters.data_inicio); }
      if (filters.data_fim) { sql += ' AND m.created_at <= ?'; params.push(filters.data_fim); }
    }
    
    const countSql = sql.replace(/SELECT m\.\*.*FROM movimentacoes m/, 'SELECT COUNT(*) as total FROM movimentacoes m');
    const total = queryOne(countSql, params)?.total || 0;
    
    sql += ' ORDER BY m.created_at DESC';
    const offset = (page - 1) * limit;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    
    return { data: queryAll(sql, params), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
};

export const logs = {
  listar(filters = {}, page = 1, limit = 30) {
    let sql = `SELECT l.*, u.username as usuario_username, u.nome_completo as usuario_nome, u.role as usuario_role FROM logs l LEFT JOIN usuarios u ON l.usuario_id = u.id WHERE 1=1`;
    const params = [];
    if (filters.tabela) { sql += ' AND l.tabela = ?'; params.push(filters.tabela); }
    if (filters.acao) { sql += ' AND l.acao = ?'; params.push(filters.acao); }
    
    // Tratamento especial: quando data_inicio === data_fim, usar date() para comparar apenas data
    if (filters.data_inicio && filters.data_fim && filters.data_inicio === filters.data_fim) {
      sql += ' AND date(l.created_at) = ?';
      params.push(filters.data_inicio);
    } else {
      if (filters.data_inicio) { sql += ' AND l.created_at >= ?'; params.push(filters.data_inicio); }
      if (filters.data_fim) { sql += ' AND l.created_at <= ?'; params.push(filters.data_fim); }
    }
    
    const countSql = sql.replace(/SELECT l\.\*.*FROM logs l/, 'SELECT COUNT(*) as total FROM logs l');
    const total = queryOne(countSql, params)?.total || 0;
    
    sql += ' ORDER BY l.created_at DESC';
    const offset = (page - 1) * limit;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    
    return { data: queryAll(sql, params), total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  exportar(filters = {}) {
    const result = this.listar({ ...filters, limit: 10000 });
    const logsData = result.data;
    const acaoLabels = { 'CREATE': 'Criação', 'UPDATE': 'Atualização', 'DELETE': 'Exclusão', 'RESTORE': 'Restauração', 'entrada': 'Entrada', 'saida': 'Saída', 'ajuste': 'Ajuste' };
    const csv = ['ID,Ação,Tabela,Registro ID,Usuário,Nome,Função,Data', ...logsData.map(l => `${l.id},${acaoLabels[l.acao] || l.acao},${l.tabela},${l.registro_id || ''},${l.usuario_username || ''},${l.usuario_nome || ''},${l.usuario_role || ''},${l.created_at}`)].join('\n');
    return csv;
  }
};

export const dashboard = {
  get() {
    const totalProdutos = queryOne('SELECT COUNT(*) as count FROM produtos WHERE deleted = 0')?.count || 0;
    const totalEstoque = queryOne('SELECT SUM(quantidade) as total FROM produtos WHERE deleted = 0')?.total || 0;
    const valorTotal = queryOne('SELECT SUM(quantidade * preco_unitario) as total FROM produtos WHERE deleted = 0')?.total || 0;
    const movimentacoesHoje = queryOne(`SELECT COUNT(*) as count FROM movimentacoes WHERE date(created_at) = date('now', 'localtime')`)?.count || 0;
    const ultimasMovimentacoes = queryAll(`SELECT m.*, p.nome as produto_nome FROM movimentacoes m LEFT JOIN produtos p ON m.produto_id = p.id ORDER BY m.created_at DESC LIMIT 5`);
    return { totalProdutos, totalEstoque, valorTotal, movimentacoesHoje, ultimasMovimentacoes };
  }
};

export default { initDatabase, usuarios, produtos, movimentacoes, logs, dashboardData: dashboard };
