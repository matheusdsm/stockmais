const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const { app } = require('electron');
const log = require('electron-log');

class StockMaisDB {
  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'stockmais.db');
    log.info('Banco de dados:', dbPath);
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('funcionario', 'supervisor', 'gerente')) NOT NULL,
        nome_completo TEXT NOT NULL,
        ativo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS movimentacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER REFERENCES produtos(id),
        tipo TEXT CHECK(tipo IN ('entrada', 'saida', 'ajuste')) NOT NULL,
        quantidade INTEGER NOT NULL,
        motivo TEXT,
        usuario_id INTEGER REFERENCES usuarios(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        acao TEXT NOT NULL,
        tabela TEXT NOT NULL,
        registro_id INTEGER,
        dados_anteriores TEXT,
        dados_novos TEXT,
        usuario_id INTEGER REFERENCES usuarios(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const count = this.db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
    if (count.count === 0) {
      this.criarUsuario({
        username: 'admin',
        password: 'admin123',
        role: 'gerente',
        nome_completo: 'Administrador'
      });
    }
  }

  gerarSKU(produto) {
    const categoria = produto.categoria?.substring(0, 3).toUpperCase() || 'GEN';
    const letras = produto.nome.substring(0, 2).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${categoria}-${letras}-${timestamp}`;
  }

  log(acao, tabela, registroId, dadosAnteriores, dadosNovos, usuarioId) {
    const stmt = this.db.prepare(`
      INSERT INTO logs (acao, tabela, registro_id, dados_anteriores, dados_novos, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      acao,
      tabela,
      registroId,
      dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
      dadosNovos ? JSON.stringify(dadosNovos) : null,
      usuarioId
    );
  }

  criarUsuario(data) {
    const hash = bcrypt.hashSync(data.password, 10);
    const stmt = this.db.prepare(`
      INSERT INTO usuarios (username, password_hash, role, nome_completo)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(data.username, hash, data.role, data.nome_completo);
    this.log('CREATE', 'usuarios', result.lastInsertRowid, null, data, null);
    return { id: result.lastInsertRowid, ...data };
  }

  login(username, password) {
    const stmt = this.db.prepare('SELECT * FROM usuarios WHERE username = ? AND ativo = 1');
    const user = stmt.get(username);
    if (!user) return null;
    
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return null;
    
    const { password_hash, ...userData } = user;
    return userData;
  }

  listarUsuarios(ativo = true) {
    const stmt = this.db.prepare('SELECT id, username, role, nome_completo, ativo, created_at FROM usuarios WHERE ativo = ?');
    return stmt.get(ativo ? 1 : 0);
  }

  atualizarUsuario(id, data) {
    const current = this.db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
    const fields = [];
    const values = [];
    
    if (data.username) { fields.push('username = ?'); values.push(data.username); }
    if (data.password) {
      fields.push('password_hash = ?');
      values.push(bcrypt.hashSync(data.password, 10));
    }
    if (data.role) { fields.push('role = ?'); values.push(data.role); }
    if (data.nome_completo) { fields.push('nome_completo = ?'); values.push(data.nome_completo); }
    
    values.push(id);
    const stmt = this.db.prepare(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    this.log('UPDATE', 'usuarios', id, current, data, null);
    return { id, ...data };
  }

  desativarUsuario(id) {
    const stmt = this.db.prepare('UPDATE usuarios SET ativo = 0 WHERE id = ?');
    stmt.run(id);
    this.log('DELETE', 'usuarios', id, null, { ativo: 0 }, null);
    return { success: true };
  }

  criarProduto(data) {
    const sku = this.gerarSKU(data);
    const stmt = this.db.prepare(`
      INSERT INTO produtos (sku, nome, descricao, quantidade, preco_unitario, localizacao, categoria)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      sku,
      data.nome,
      data.descricao || null,
      data.quantidade || 0,
      data.preco_unitario || 0,
      data.localizacao || null,
      data.categoria || null
    );
    
    this.log('CREATE', 'produtos', result.lastInsertRowid, null, { ...data, sku }, null);
    return { id: result.lastInsertRowid, sku, ...data };
  }

  listarProdutos(search = '') {
    let sql = 'SELECT * FROM produtos WHERE deleted = 0';
    const params = [];
    
    if (search) {
      sql += ' AND (nome LIKE ? OR sku LIKE ? OR categoria LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    
    sql += ' ORDER BY created_at DESC';
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  getProduto(id) {
    const stmt = this.db.prepare('SELECT * FROM produtos WHERE id = ? AND deleted = 0');
    return stmt.get(id);
  }

  atualizarProduto(id, data) {
    const current = this.getProduto(id);
    const fields = [];
    const values = [];
    
    if (data.nome) { fields.push('nome = ?'); values.push(data.nome); }
    if (data.descricao !== undefined) { fields.push('descricao = ?'); values.push(data.descricao); }
    if (data.quantidade !== undefined) { fields.push('quantidade = ?'); values.push(data.quantidade); }
    if (data.preco_unitario !== undefined) { fields.push('preco_unitario = ?'); values.push(data.preco_unitario); }
    if (data.localizacao !== undefined) { fields.push('localizacao = ?'); values.push(data.localizacao); }
    if (data.categoria !== undefined) { fields.push('categoria = ?'); values.push(data.categoria); }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = this.db.prepare(`UPDATE produtos SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    this.log('UPDATE', 'produtos', id, current, data, null);
    return { id, ...data };
  }

  excluirProduto(id) {
    const stmt = this.db.prepare('UPDATE produtos SET deleted = 1 WHERE id = ?');
    stmt.run(id);
    this.log('DELETE', 'produtos', id, null, { deleted: 1 }, null);
    return { success: true };
  }

  criarMovimentacao(data) {
    const stmt = this.db.prepare(`
      INSERT INTO movimentacoes (produto_id, tipo, quantidade, motivo, usuario_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.produto_id,
      data.tipo,
      data.quantidade,
      data.motivo || null,
      data.usuario_id
    );

    const produto = this.getProduto(data.produto_id);
    let novaQuantidade = produto.quantidade;
    
    if (data.tipo === 'entrada') {
      novaQuantidade += data.quantidade;
    } else if (data.tipo === 'saida') {
      novaQuantidade -= data.quantidade;
    } else if (data.tipo === 'ajuste') {
      novaQuantidade = data.quantidade;
    }

    this.db.prepare('UPDATE produtos SET quantidade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(novaQuantidade, data.produto_id);

    this.log('CREATE', 'movimentacoes', result.lastInsertRowid, null, data, data.usuario_id);
    return { id: result.lastInsertRowid, nova_quantidade: novaQuantidade };
  }

  listarMovimentacoes(filters = {}) {
    let sql = `
      SELECT m.*, p.nome as produto_nome, p.sku, u.username as usuario_username
      FROM movimentacoes m
      LEFT JOIN produtos p ON m.produto_id = p.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.produto_id) {
      sql += ' AND m.produto_id = ?';
      params.push(filters.produto_id);
    }
    if (filters.tipo) {
      sql += ' AND m.tipo = ?';
      params.push(filters.tipo);
    }
    if (filters.data_inicio) {
      sql += ' AND m.created_at >= ?';
      params.push(filters.data_inicio);
    }
    if (filters.data_fim) {
      sql += ' AND m.created_at <= ?';
      params.push(filters.data_fim);
    }

    sql += ' ORDER BY m.created_at DESC';
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  listarLogs(filters = {}) {
    let sql = `
      SELECT l.*, u.username as usuario_username
      FROM logs l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.tabela) {
      sql += ' AND l.tabela = ?';
      params.push(filters.tabela);
    }
    if (filters.acao) {
      sql += ' AND l.acao = ?';
      params.push(filters.acao);
    }
    if (filters.data_inicio) {
      sql += ' AND l.created_at >= ?';
      params.push(filters.data_inicio);
    }
    if (filters.data_fim) {
      sql += ' AND l.created_at <= ?';
      params.push(filters.data_fim);
    }

    sql += ' ORDER BY l.created_at DESC';
    if (filters.limit) sql += ` LIMIT ${filters.limit}`;
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  exportarLogs(filters = {}) {
    const logs = this.listarLogs({ ...filters, limit: 10000 });
    
    const csv = [
      'ID,Ação,Tabela,Registro ID,Usuário,Data',
      ...logs.map(l => `${l.id},${l.acao},${l.tabela},${l.registro_id || ''},${l.usuario_username || ''},${l.created_at}`)
    ].join('\n');
    
    return csv;
  }

  getDashboard() {
    const totalProdutos = this.db.prepare('SELECT COUNT(*) as count FROM produtos WHERE deleted = 0').get().count;
    const totalEstoque = this.db.prepare('SELECT SUM(quantidade) as total FROM produtos WHERE deleted = 0').get().total || 0;
    const ValorTotal = this.db.prepare('SELECT SUM(quantidade * preco_unitario) as total FROM produtos WHERE deleted = 0').get().total || 0;
    const movimentacoesHoje = this.db.prepare(`
      SELECT COUNT(*) as count FROM movimentacoes 
      WHERE date(created_at) = date('now')
    `).get().count;

    const ultimasMovimentacoes = this.db.prepare(`
      SELECT m.*, p.nome as produto_nome 
      FROM movimentacoes m
      LEFT JOIN produtos p ON m.produto_id = p.id
      ORDER BY m.created_at DESC
      LIMIT 5
    `).all();

    return { totalProdutos, totalEstoque, ValorTotal, movimentacoesHoje, ultimasMovimentacoes };
  }

  close() {
    this.db.close();
  }
}

module.exports = StockMaisDB;
