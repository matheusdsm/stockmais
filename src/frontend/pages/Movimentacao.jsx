import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/GlobalStyles';
import { api } from '../services/api';
import { useAuth } from '../App';
import { toLocaleStringBR } from '../utils/date';

const PageHeader = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const Title = styled.h1`
  color: ${theme.colors.text};
`;

const FormCard = styled.div`
  background: ${theme.colors.surface};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius};
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: ${theme.spacing.lg};
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.md};
  align-items: end;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const Label = styled.label`
  font-weight: 500;
  color: ${theme.colors.neutral};
`;

const Select = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius};
  background: white;
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
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

const Button = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius};
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    background: ${theme.colors.primaryHover};
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

const Badge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: ${theme.fontSize.small};
  font-weight: 500;
  background: ${props => props.tipo === 'entrada' ? theme.colors.success : props.tipo === 'saida' ? theme.colors.danger : theme.colors.warning};
  color: white;
`;

const RoleBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: ${theme.fontSize.small};
  background: ${props => props.$role === 'gerente' ? theme.colors.primary : props.$role === 'supervisor' ? theme.colors.warning : theme.colors.neutralLight};
  color: white;
`;

const RoleCell = styled.td`
  color: ${props => props.$isSistema ? theme.colors.textSecondary : 'inherit'};
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

export default function Movimentacao() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [form, setForm] = useState({ produto_id: '', tipo: 'entrada', quantidade: 1, motivo: '' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    const prods = await api.getProdutos();
    setProdutos(prods.data || []);
    const movs = await api.getMovimentacoes({}, page, 10);
    setMovimentacoes(movs.data || []);
    setTotalPages(movs.totalPages || 1);
    setTotal(movs.total || 0);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Usuário não identificado. Faça login novamente.');
      return;
    }
    if (!form.produto_id) {
      alert('Selecione um produto');
      return;
    }
    try {
      await api.criarMovimentacao({ ...form, usuario_id: user.id }, user.role);
      setForm({ produto_id: '', tipo: 'entrada', quantidade: 1, motivo: '' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <PageHeader>
        <Title>Movimentação de Estoque</Title>
      </PageHeader>

      {user?.role === 'visitante' ? (
        <FormCard>
          <p style={{ textAlign: 'center', color: theme.colors.textSecondary }}>
            Visitantes não podem registrar movimentações.
          </p>
        </FormCard>
      ) : (
        <FormCard>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>Produto *</Label>
              <Select value={form.produto_id} onChange={e => setForm({...form, produto_id: e.target.value})} required>
                <option value="">Selecione...</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} (SKU: {p.sku})</option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
                <option value="ajuste">Ajuste</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Quantidade *</Label>
              <Input type="number" min="1" value={form.quantidade} onChange={e => setForm({...form, quantidade: parseInt(e.target.value)})} required />
            </FormGroup>
            <FormGroup>
              <Label>Motivo</Label>
              <Input value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} placeholder="Opcional" />
            </FormGroup>
            <Button type="submit">Registrar</Button>
          </Form>
        </FormCard>
      )}

      <Table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Produto</th>
            <th>Tipo</th>
            <th>Quantidade</th>
            <th>Motivo</th>
            <th>Usuário</th>
            <th>Função</th>
          </tr>
        </thead>
        <tbody>
          {movimentacoes.length === 0 ? (
            <tr><td colSpan="7" style={{ textAlign: 'center' }}>Nenhuma movimentação registrada</td></tr>
          ) : movimentacoes.map(m => (
            <tr key={m.id}>
              <td>{toLocaleStringBR(m.created_at)}</td>
              <td>{m.produto_nome}</td>
              <td><Badge tipo={m.tipo}>{m.tipo}</Badge></td>
              <td>{m.quantidade}</td>
              <td>{m.motivo || '-'}</td>
              <td>{m.usuario_username ? `${m.usuario_nome} (${m.usuario_username})` : '-'}</td>
              <RoleCell $isSistema={!m.usuario_username}>
                {m.usuario_username ? <RoleBadge $role={m.usuario_role}>{m.usuario_role}</RoleBadge> : 'Sistema'}
              </RoleCell>
            </tr>
          ))}
        </tbody>
      </Table>

      {totalPages > 1 && (
        <Pagination>
          <PageButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</PageButton>
          <PageInfo>Página {page} de {totalPages} ({total} itens)</PageInfo>
          <PageButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</PageButton>
        </Pagination>
      )}
    </div>
  );
}
