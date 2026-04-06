# STOCKMAIS - Sistema de Controle de Estoque

## 1. Visão Geral do Projeto

Sistema web de controle de estoque interno para operação em rede local (LAN), desenvolvido com React + Express + SQLite. O sistema segue o Atlassian Design System e atende todos os requisitos funcionais e não-funcionais especificados.

---

## 2. Arquitetura Técnica

### Stack Tecnológico
- **Frontend:** React 18 + Vite + Styled Components
- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3)
- **Execution:** `npm run dev` (前端 + backend)

### Estrutura de Diretórios
```
stockmais/
├── src/
│   ├── backend/          # API Express
│   │   ├── database.js   # SQLite
│   │   ├── routes.js    # Endpoints API
│   │   └── server.js    # Servidor
│   └── frontend/         # React
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── styles/
├── package.json
└── vite.config.js
```

---

## 3. Schema do Banco de Dados SQLite

### Tabelas

```sql
-- Usuários com hierarquia
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('funcionario', 'supervisor', 'gerente')) NOT NULL,
    nome_completo TEXT NOT NULL,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Produtos
CREATE TABLE produtos (
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

-- Movimentações (entradas/saídas)
CREATE TABLE movimentacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER REFERENCES produtos(id),
    tipo TEXT CHECK(tipo IN ('entrada', 'saida', 'ajuste')) NOT NULL,
    quantidade INTEGER NOT NULL,
    motivo TEXT,
    usuario_id INTEGER REFERENCES usuarios(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Logs de auditoria
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    acao TEXT NOT NULL,
    tabela TEXT NOT NULL,
    registro_id INTEGER,
    dados_anteriores TEXT,
    dados_novos TEXT,
    usuario_id INTEGER REFERENCES usuarios(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. API Endpoints

| Método | Endpoint | Descrição |
|---|---|---|
| POST | /api/auth/login | Login |
| GET | /api/usuarios | Listar usuários |
| POST | /api/usuarios | Criar usuário |
| PUT | /api/usuarios/:id | Atualizar usuário |
| DELETE | /api/usuarios/:id | Desativar usuário |
| GET | /api/produtos | Listar produtos |
| POST | /api/produtos | Criar produto |
| PUT | /api/produtos/:id | Atualizar produto |
| DELETE | /api/produtos/:id | Excluir produto |
| POST | /api/movimentacoes | Criar movimentação |
| GET | /api/movimentacoes | Listar movimentações |
| GET | /api/logs | Listar logs |
| GET | /api/logs/export | Exportar CSV |
| GET | /api/dashboard | Dados dashboard |

---

## 5. Mapeamento de Requisitos

| ID | Requisito | Funcionalidade | Página/Componente |
|---|---|---|---|
| RF-01 | Efetuar Login | Autenticação com session | LoginPage |
| RF-02 | Consultar Estoque | Listagem e busca de produtos | EstoquePage |
| RF-03 | Criar Produto | Formulário + geração SKU | ProdutoForm |
| RF-04 | Editar Produto | Update com validação | ProdutoForm |
| RF-05 | Excluir Produto | Soft delete (role gerente) | EstoquePage |
| RF-06 | Gerar SKU | Algoritmo automático | Service SKU |
| RF-07 | Gerenciar Movimentação | Entrada/saída/ajuste | MovimentacaoPage |
| RF-08 | Adicionar Funcionario | Criar usuário | FuncionarioPage |
| RF-09 | Remover Funcionario | Desativar usuário | FuncionarioPage |
| RF-10 | Acessar Histórico | Consulta logs | HistoricoPage |
| RF-11 | Exportar Histórico | CSV | HistoricoPage |
| RF-12 | Gerar Log | Auditoria automática | Hook/Service |

### Requisitos Não-Funcionais
- **RNF-01:** Hierarquia implementada no campo `role`
- **RNF-02:** Todos os CRUDs geram registros na tabela `logs`
- **RNF-03:** SKU vinculado às movimentações via `produto_id`
- **RNF-04:** SQLite funciona 100% offline em LAN
- **RNF-05:** Rotas protegidas, redirecionamento se não autenticado

---

## 6. Componentes de Interface (Atlassian Design)

### Paleta de Cores
| Token | Hex | Uso |
|---|---|---|
| primary | #0052CC | Botões principais, links |
| neutral | #42526E | Textos, ícones |
| success | #36B37E | Confirmações |
| warning | #FFAB00 | Alertas |
| danger | #FF5630 | Erros, excluir |

### Componentes Principais
1. **Button** - Variantes: primary, subtle, danger
2. **TextField** - Estados: default, hover, focus, disabled, error
3. **Table** - Listagem com ordenação
4. **Modal** - Confirmações e formulários
5. **Sidebar** - Navegação entre páginas
6. **Header** - Barra com usuário logado e logout

### Páginas
1. **Login** - Formulário autenticação
2. **Dashboard** - Resumo estoque
3. **Estoque** - Lista produtos, busca, CRUD
4. **Movimentação** - Registro entrada/saída
5. **Funcionários** - Gestão usuários (gerente)
6. **Histórico** - Logs e exportação

---

## 7. Roles e Permissões

| Role | Criar Produto | Editar | Excluir | Funcionário | Histórico |
|---|---|---|---|---|---|
| Funcionario | ✅ | ✅ | ❌ | ❌ | ❌ |
| Supervisor | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gerente | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 8. Algoritmo de Geração SKU

```javascript
function gerarSKU(produto) {
  const categoria = produto.categoria?.substring(0, 3).toUpperCase() || 'GEN';
  const letras = produto.nome.substring(0, 2).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${categoria}-${letras}-${timestamp}`;
}
```

---

## 9. Dependências

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "better-sqlite3": "^9.4.3",
    "bcrypt": "^5.1.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3",
    "styled-components": "^6.1.8"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.4",
    "concurrently": "^8.2.2"
  }
}
```

---

## 10. Critérios de Aceite

- [ ] Login funciona com validação de role
- [ ] CRUD produtos gera SKU automaticamente
- [ ] Movimentações atualizam quantidade em estoque
- [ ] Gerente pode gerenciar funcionários
- [ ] Todos operações geram log de auditoria
- [ ] Interface segue design Atlassian (cores/spacing)
- [ ] Sistema funciona 100% offline
- [ ] Servidor inicia corretamente com npm run dev
