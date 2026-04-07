import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/GlobalStyles';
import { api } from '../services/api';
import { useAuth } from '../App';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
`;

const Title = styled.h1`
  color: ${theme.colors.text};
`;

const SearchBar = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

const SearchInput = styled.input`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius};
  width: 300px;
`;

const Button = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.variant === 'danger' ? theme.colors.danger : props.variant === 'subtle' ? 'transparent' : theme.colors.primary};
  color: ${props => props.variant === 'subtle' ? theme.colors.primary : 'white'};
  border: ${props => props.variant === 'subtle' ? `1px solid ${theme.colors.primary}` : 'none'};
  border-radius: ${theme.borderRadius};
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    opacity: 0.9;
  }
`;

const Table = styled.table`
  width: 100%;
  background: ${theme.colors.surface};
  border-collapse: collapse;
  border-radius: ${theme.borderRadius};
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  
  th, td {
    padding: ${theme.spacing.md};
    text-align: left;
    border-bottom: 1px solid ${theme.colors.border};
  }
  
  th {
    background: ${theme.colors.background};
    font-weight: 600;
    color: ${theme.colors.textSecondary};
    font-size: ${theme.fontSize.small};
  }
  
  tr:hover {
    background: ${theme.colors.background};
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${theme.colors.surface};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius};
  width: 500px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.md};
`;

const Label = styled.label`
  font-weight: 500;
  color: ${theme.colors.neutral};
`;

const Input = styled.input`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

const Actions = styled.td`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const Badge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: ${theme.fontSize.small};
  background: ${theme.colors.neutralLight};
  color: white;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
`;

const PageButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.$active ? theme.colors.primary : theme.colors.surface};
  color: ${props => props.$active ? 'white' : theme.colors.text};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius};
  cursor: pointer;
  
  &:hover {
    background: ${props => props.$active ? theme.colors.primary : theme.colors.background};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.small};
`;

export default function Estoque() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [produtosExcluidos, setProdutosExcluidos] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', descricao: '', quantidade: 0, preco_unitario: 0, localizacao: '', categoria: '' });
  const [loading, setLoading] = useState(true);
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadProdutos();
  }, [search, page]);

  const loadProdutos = async () => {
    const data = await api.getProdutos(search, page, 10);
    setProdutos(data.data || []);
    setTotalPages(data.totalPages || 1);
    setTotal(data.total || 0);
    const excluidos = await api.getProdutosExcluidos();
    setProdutosExcluidos(excluidos);
    setLoading(false);
  };

  const handleRestore = async (id) => {
    if (!user?.id) {
      alert('Usuário não identificado. Faça login novamente.');
      return;
    }
    if (user?.role !== 'gerente' && user?.role !== 'supervisor') {
      alert('Apenas gerentes e supervisores podem restaurar produtos');
      return;
    }
    if (confirm('Tem certeza que deseja restaurar este produto?')) {
      await api.restaurarProduto(id, user.id, user.role);
      loadProdutos();
    }
  };

  const openModal = (produto = null) => {
    if (produto) {
      setEditando(produto);
      setForm(produto);
    } else {
      setEditando(null);
      setForm({ nome: '', descricao: '', quantidade: 0, preco_unitario: 0, localizacao: '', categoria: '' });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditando(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Usuário não identificado. Faça login novamente.');
      return;
    }
    try {
      if (editando) {
        await api.atualizarProduto(editando.id, form, user.id, user.role);
      } else {
        await api.criarProduto(form, user.id, user.role);
      }
      closeModal();
      loadProdutos();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!user?.id) {
      alert('Usuário não identificado. Faça login novamente.');
      return;
    }
    if (user?.role !== 'gerente' && user?.role !== 'supervisor') {
      alert('Apenas gerentes e supervisores podem excluir produtos');
      return;
    }
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await api.excluirProduto(id, user.id, user.role);
      loadProdutos();
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <PageHeader>
        <Title>Estoque</Title>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          {(user?.role === 'gerente' || user?.role === 'supervisor') && (
            <Button variant="subtle" onClick={() => setMostrarExcluidos(!mostrarExcluidos)}>
              {mostrarExcluidos ? 'Ver Ativos' : `Ver Excluídos (${produtosExcluidos?.length || 0})`}
            </Button>
          )}
          {!mostrarExcluidos && user?.role !== 'visitante' && <Button onClick={() => openModal()}>+ Novo Produto</Button>}
        </div>
      </PageHeader>

      {!mostrarExcluidos ? (
        <>
          <SearchBar>
            <SearchInput 
              type="text" 
              placeholder="Buscar por nome, SKU ou categoria..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </SearchBar>

          <Table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Preço Unit.</th>
                <th>Localização</th>
                <th>Criado por</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center' }}>Nenhum produto encontrado</td></tr>
              ) : produtos.map(p => (
                <tr key={p.id}>
                  <td><Badge>{p.sku}</Badge></td>
                  <td>{p.nome}</td>
                  <td>{p.categoria || '-'}</td>
                  <td>{p.quantidade}</td>
                  <td>{formatCurrency(p.preco_unitario)}</td>
                  <td>{p.localizacao || '-'}</td>
                  <td>{p.usuario_nome || '-'}</td>
                  <td>
                    <Actions>
                      {user?.role !== 'visitante' && (
                        <Button variant="subtle" onClick={() => openModal(p)}>Editar</Button>
                      )}
                      {(user?.role === 'gerente' || user?.role === 'supervisor') && (
                        <Button variant="danger" onClick={() => handleDelete(p.id)}>Excluir</Button>
                      )}
                    </Actions>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {!mostrarExcluidos && totalPages > 1 && (
            <Pagination>
              <PageButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</PageButton>
              <PageInfo>Página {page} de {totalPages} ({total} itens)</PageInfo>
              <PageButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</PageButton>
            </Pagination>
          )}
        </>
      ) : (
        <div>
          <h3 style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.md }}>Produtos Excluídos</h3>
          <Table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Excluído Por</th>
                <th>Data Exclusão</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(produtosExcluidos?.length || 0) === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Nenhum produto excluido</td></tr>
              ) : (produtosExcluidos || []).map(p => (
                <tr key={p.id}>
                  <td><Badge>{p.sku}</Badge></td>
                  <td>{p.nome}</td>
                  <td>{p.categoria || '-'}</td>
                  <td>{p.quantidade}</td>
                  <td>{p.excluido_por_nome || '-'}</td>
                  <td>{p.updated_at ? new Date(p.updated_at).toLocaleDateString('pt-BR') : '-'}</td>
                  <td>
                    <Actions>
                      {(user?.role === 'gerente' || user?.role === 'supervisor') && (
                        <Button variant="subtle" onClick={() => handleRestore(p.id)}>Restaurar</Button>
                      )}
                    </Actions>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {modalOpen && (
        <Modal>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h2>{editando ? 'Editar Produto' : 'Novo Produto'}</h2>
              <Button variant="subtle" onClick={closeModal}>✕</Button>
            </ModalHeader>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required />
              </FormGroup>
              <FormGroup>
                <Label>Descrição</Label>
                <Input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
              </FormGroup>
              <FormGroup>
                <Label>Categoria</Label>
                <Input value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} />
              </FormGroup>
              <FormGroup>
                <Label>Quantidade</Label>
                <Input type="number" min="0" value={form.quantidade} onChange={e => setForm({...form, quantidade: parseInt(e.target.value)})} />
              </FormGroup>
              <FormGroup>
                <Label>Preço Unitário</Label>
                <Input type="number" step="0.01" min="0" value={form.preco_unitario} onChange={e => setForm({...form, preco_unitario: parseFloat(e.target.value)})} />
              </FormGroup>
              <FormGroup>
                <Label>Localização</Label>
                <Input value={form.localizacao} onChange={e => setForm({...form, localizacao: e.target.value})} />
              </FormGroup>
              <Button type="submit">{editando ? 'Salvar' : 'Criar'}</Button>
            </form>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}
