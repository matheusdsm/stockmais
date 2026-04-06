import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/GlobalStyles';
import { api } from '../services/api';
import { toLocaleStringBR } from '../utils/date';

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const StatCard = styled.div`
  background: ${theme.colors.surface};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius};
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const StatLabel = styled.div`
  font-size: ${theme.fontSize.small};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const StatValue = styled.div`
  font-size: 28px;
  font-weight: 600;
  color: ${theme.colors.text};
`;

const Section = styled.section`
  background: ${theme.colors.surface};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius};
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.md};
`;

const MovTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    text-align: left;
    border-bottom: 1px solid ${theme.colors.border};
  }
  
  th {
    font-weight: 600;
    color: ${theme.colors.textSecondary};
    font-size: ${theme.fontSize.small};
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

export default function Dashboard() {
  const [data, setData] = useState({ totalProdutos: 0, totalEstoque: 0, valorTotal: 0, movimentacoesHoje: 0, ultimasMovimentacoes: [], ultimosProdutos: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: theme.spacing.lg }}>Dashboard</h1>
      <StatsGrid>
        <StatCard>
          <StatLabel>Total de Produtos</StatLabel>
          <StatValue>{data.totalProdutos}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Quantidade em Estoque</StatLabel>
          <StatValue>{data.totalEstoque}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Valor Total em Estoque</StatLabel>
          <StatValue>{formatCurrency(data.valorTotal)}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Movimentações Hoje</StatLabel>
          <StatValue>{data.movimentacoesHoje}</StatValue>
        </StatCard>
      </StatsGrid>
      
      <Section>
        <SectionTitle>Últimas Movimentações</SectionTitle>
        <MovTable>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {data.ultimasMovimentacoes.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center' }}>Nenhuma movimentação</td></tr>
            ) : data.ultimasMovimentacoes.map(m => (
              <tr key={m.id}>
                <td>{m.produto_nome}</td>
                <td><Badge tipo={m.tipo}>{m.tipo}</Badge></td>
                <td>{m.quantidade}</td>
                <td>{toLocaleStringBR(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </MovTable>
      </Section>

      <Section style={{ marginTop: theme.spacing.lg }}>
        <SectionTitle>Últimos Produtos Cadastrados</SectionTitle>
        <MovTable>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nome</th>
              <th>Quantidade</th>
              <th>Categoria</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {data.ultimosProdutos.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Nenhum produto</td></tr>
            ) : data.ultimosProdutos.map(p => (
              <tr key={p.id}>
                <td><Badge>{p.sku}</Badge></td>
                <td>{p.nome}</td>
                <td>{p.quantidade}</td>
                <td>{p.categoria || '-'}</td>
                <td>{toLocaleStringBR(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </MovTable>
      </Section>
    </div>
  );
}
