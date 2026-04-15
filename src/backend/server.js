import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';
const { initDatabase, usuarios, produtos, movimentacoes, logs, dashboardData } = db;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const frontendDist = path.join(__dirname, '../../dist');

import fs from 'fs';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

await initDatabase();

const app = express();
app.use(cors());
app.use(express.json());

const apiRouter = express.Router();
app.use('/api', apiRouter);

// Middleware para verificar se não é visitante
const naoVisitante = (req, res, next) => {
  const { role } = req.body;
  if (role === 'visitante') {
    return res.status(403).json({ error: 'Visitantes não podem realizar esta ação' });
  }
  next();
};

// Middleware para verificar se é gerente
const verificarGerente = (req, res, next) => {
  const { role } = req.body;
  if (role !== 'gerente') {
    return res.status(403).json({ error: 'Apenas gerentes podem realizar esta ação' });
  }
  next();
};

apiRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username e senha são obrigatórios' });
  }
  const user = usuarios.login(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  res.json(user);
});

apiRouter.get('/usuarios', (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const result = usuarios.listarTodos(parseInt(page), parseInt(limit));
  res.json(result);
});

apiRouter.post('/usuarios', verificarGerente, (req, res) => {
  const { username, password, role, nome_completo, usuario_id } = req.body;
  if (!username || !password || !role || !nome_completo) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  try {
    const user = usuarios.criar({ username, password, role, nome_completo, usuario_id });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.put('/usuarios/:id', verificarGerente, (req, res) => {
  const { id } = req.params;
  const { username, password, role, nome_completo, usuario_id } = req.body;
  const user = usuarios.atualizar(id, { username, password, role, nome_completo }, usuario_id);
  res.json(user);
});

apiRouter.delete('/usuarios/:id', verificarGerente, (req, res) => {
  const { id } = req.params;
  const { usuario_id } = req.body;
  usuarios.desativar(id, usuario_id);
  res.json({ success: true });
});

apiRouter.post('/usuarios/:id/restore', verificarGerente, (req, res) => {
  const { id } = req.params;
  const { usuario_id } = req.body;
  const result = usuarios.reativar(id, usuario_id);
  res.json(result);
});

apiRouter.get('/usuarios/inativos', (req, res) => {
  const items = usuarios.listarInativos();
  res.json(items);
});

apiRouter.get('/produtos', (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const items = produtos.listar(search || '', parseInt(page), parseInt(limit));
  res.json(items);
});

apiRouter.get('/produtos/excluidos', (req, res) => {
  const items = produtos.listarExcluidos();
  res.json(items);
});

apiRouter.post('/produtos', naoVisitante, (req, res) => {
  const { nome, descricao, quantidade, preco_unitario, localizacao, categoria, usuario_id } = req.body;
  if (!nome) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  const item = produtos.criar({ nome, descricao, quantidade, preco_unitario, localizacao, categoria, usuario_id });
  res.json(item);
});

apiRouter.get('/produtos/:id', (req, res) => {
  const { id } = req.params;
  const item = produtos.get(id);
  if (!item) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }
  res.json(item);
});

apiRouter.put('/produtos/:id', naoVisitante, (req, res) => {
  const { id } = req.params;
  const { nome, descricao, quantidade, preco_unitario, localizacao, categoria, usuario_id } = req.body;
  const item = produtos.atualizar(id, { nome, descricao, quantidade, preco_unitario, localizacao, categoria }, usuario_id);
  res.json(item);
});

apiRouter.delete('/produtos/:id', naoVisitante, (req, res) => {
  const { id } = req.params;
  const { usuario_id } = req.body;
  produtos.excluir(id, usuario_id);
  res.json({ success: true });
});

apiRouter.post('/produtos/:id/restore', naoVisitante, (req, res) => {
  const { id } = req.params;
  const { usuario_id } = req.body;
  const result = produtos.restaurar(id, usuario_id);
  res.json(result);
});

apiRouter.get('/produtos/excluidos', (req, res) => {
  const items = produtos.listarExcluidos();
  res.json(items);
});

apiRouter.post('/movimentacoes', (req, res) => {
  const { produto_id, tipo, quantidade, motivo, usuario_id } = req.body;
  if (!produto_id || !tipo || quantidade === undefined || !usuario_id) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  const item = movimentacoes.criar({ produto_id, tipo, quantidade, motivo, usuario_id });
  res.json(item);
});

apiRouter.get('/movimentacoes', (req, res) => {
  const { produto_id, tipo, data_inicio, data_fim, page = 1, limit = 10 } = req.query;
  const items = movimentacoes.listar({ produto_id, tipo, data_inicio, data_fim }, parseInt(page), parseInt(limit));
  res.json(items);
});

apiRouter.get('/logs', (req, res) => {
  const { tabela, acao, data_inicio, data_fim, page = 1, limit = 30 } = req.query;
  const items = logs.listar({ tabela, acao, data_inicio, data_fim }, parseInt(page), parseInt(limit));
  res.json(items);
});

apiRouter.get('/logs/export', (req, res) => {
  const { tabela, acao, data_inicio, data_fim } = req.query;
  const csv = logs.exportar({ tabela, acao, data_inicio, data_fim });
  res.header('Content-Type', 'text/csv');
  res.attachment('logs.csv');
  res.send(csv);
});

apiRouter.get('/dashboard', (req, res) => {
  const data = dashboardData.get();
  res.json(data);
});

// AFTER all API routes - serve frontend for any non-API route
if (fs.existsSync(frontendDist)) {
  // First serve static files (JS, CSS, images)
  app.use(express.static(frontendDist));
  
  // Then handle SPA routes - serve index.html for ANY GET request that isn't an API call
  app.get('*', (req, res) => {
    // Skip API routes only
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return res.status(404).json({ error: 'Rota não encontrada' });
    }
    // Serve index.html for all other routes (SPA)
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Manter o listen só para dev local:
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Servidor STOCKMAIS rodando na porta ${PORT}`);
  });
}

// No final do server.js, SUBSTITUIR o app.listen por:
export default app;
