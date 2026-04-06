import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/GlobalStyles';
import { api } from '../services/api';
import { toLocaleStringBR } from '../utils/date';
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

const Filters = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius};
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const Label = styled.label`
  font-size: ${theme.fontSize.small};
  color: ${theme.colors.textSecondary};
`;

const Select = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius};
  background: white;
`;

const Input = styled.input`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius};
`;

const Button = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.variant === 'success' ? theme.colors.success : theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius};
  font-weight: 500;
  align-self: flex-end;
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

const ActionBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: ${theme.fontSize.small};
  background: ${props => props.acao === 'CREATE' ? theme.colors.success : props.acao === 'UPDATE' ? theme.colors.warning : props.acao === 'RESTORE' ? theme.colors.primary : props.acao === 'entrada' ? theme.colors.success : props.acao === 'saida' ? theme.colors.danger : props.acao === 'ajuste' ? theme.colors.warning : theme.colors.danger};
  color: white;
`;

const acaoLabels = {
  'CREATE': 'Criação',
  'UPDATE': 'Atualização',
  'DELETE': 'Exclusão',
  'RESTORE': 'Restauração',
  'entrada': 'Entrada',
  'saida': 'Saída',
  'ajuste': 'Ajuste'
};

const DataCell = styled.td`
  font-family: monospace;
  font-size: ${theme.fontSize.small};
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

export default function Historico() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ tabela: '', acao: '', data_inicio: '', data_fim: '' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadLogs();
  }, [filters, page]);

  const loadLogs = async () => {
    const data = await api.getLogs(filters, page, 30);
    setLogs(data.data || []);
    setTotalPages(data.totalPages || 1);
    setTotal(data.total || 0);
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportarLogs(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const dataStr = now.toLocaleString('pt-BR').replace(', ', '-').replace(/\//g, ':');
      a.download = `logs_stockmais_${dataStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao exportar: ' + err.message);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <PageHeader>
        <Title>Histórico de Operações</Title>
        {user?.role !== 'visitante' && <Button variant="success" onClick={handleExport}>Exportar CSV</Button>}
      </PageHeader>

      <Filters>
        <FilterGroup>
          <Label>Tabela</Label>
          <Select value={filters.tabela} onChange={e => setFilters({...filters, tabela: e.target.value})}>
            <option value="">Todas</option>
            <option value="usuarios">Usuários</option>
            <option value="produtos">Produtos</option>
            <option value="movimentacoes">Movimentações</option>
          </Select>
        </FilterGroup>
        <FilterGroup>
          <Label>Ação</Label>
          <Select value={filters.acao} onChange={e => setFilters({...filters, acao: e.target.value})}>
            <option value="">Todas</option>
            <option value="CREATE">Criação</option>
            <option value="UPDATE">Atualização</option>
            <option value="DELETE">Exclusão</option>
            <option value="RESTORE">Restauração</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="ajuste">Ajuste</option>
          </Select>
        </FilterGroup>
        <FilterGroup>
          <Label>Data Início</Label>
          <Input type="date" value={filters.data_inicio} onChange={e => { setFilters({...filters, data_inicio: e.target.value}); setPage(1); }} />
        </FilterGroup>
        <FilterGroup>
          <Label>Data Fim</Label>
          <Input type="date" value={filters.data_fim} onChange={e => { setFilters({...filters, data_fim: e.target.value}); setPage(1); }} />
        </FilterGroup>
      </Filters>

      <Table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Ação</th>
            <th>Tabela</th>
            <th>SKU</th>
            <th>Registro ID</th>
            <th>Usuário</th>
            <th>Função</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan="7" style={{ textAlign: 'center' }}>Nenhum registro encontrado</td></tr>
          ) : logs.map(l => {
            const dadosNovos = l.dados_novos ? JSON.parse(l.dados_novos) : null
            const dadosAnteriores = l.dados_anteriores ? JSON.parse(l.dados_anteriores) : null
            const sku = dadosNovos?.sku || dadosAnteriores?.sku || '-'
            
            return (
            <tr key={l.id}>
              <DataCell>{toLocaleStringBR(l.created_at)}</DataCell>
              <td><ActionBadge acao={l.acao}>{acaoLabels[l.acao] || l.acao}</ActionBadge></td>
              <td>{l.tabela}</td>
              <DataCell>{sku}</DataCell>
              <td>{l.registro_id || '-'}</td>
              <td>{l.usuario_username ? `${l.usuario_nome} (${l.usuario_username})` : '-'}</td>
              <RoleCell $isSistema={!l.usuario_username}>
                {l.usuario_username ? <RoleBadge $role={l.usuario_role}>{l.usuario_role}</RoleBadge> : 'Sistema'}
              </RoleCell>
            </tr>
          )})}
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
