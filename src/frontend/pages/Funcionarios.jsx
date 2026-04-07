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

const Button = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.variant === 'danger' ? theme.colors.danger : theme.colors.primary};
  color: white;
  border: none;
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
  width: 400px;
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

const Select = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius};
  background: white;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: ${theme.fontSize.small};
  background: ${props => props.role === 'gerente' ? theme.colors.primary : props.role === 'supervisor' ? theme.colors.warning : theme.colors.neutralLight};
  color: white;
`;

const Actions = styled.td`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const EditButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.warning};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius};
  cursor: pointer;
  font-size: ${theme.fontSize.small};
  
  &:hover {
    opacity: 0.9;
  }
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

export default function Funcionarios() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'funcionário', nome_completo: '' });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', role: 'funcionário', nome_completo: '' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadUsuarios();
  }, [page]);

  const loadUsuarios = async () => {
    const data = await api.getUsuarios(page, 5);
    setUsuarios(data.data || []);
    setTotalPages(data.totalPages || 1);
    setTotal(data.total || 0);
    setLoading(false);
  };

  const openModal = () => {
    setForm({ username: '', password: '', role: 'funcionário', nome_completo: '' });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await api.criarUsuario(form, user.role);
      if (result.error) {
        alert(result.error);
        return;
      }
      closeModal();
      loadUsuarios();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!user?.id) {
      alert('Usuário não identificado. Faça login novamente.');
      return;
    }
    if (confirm('Tem certeza que deseja desativar este funcionário?')) {
      try {
        const result = await api.desativarUsuario(id, user.id, user.role);
        console.log('Desativar resultado:', result);
        if (result.error) {
          alert(result.error);
        }
        loadUsuarios();
      } catch (err) {
        console.error('Erro ao desativar:', err);
        alert('Erro ao desativar usuário');
      }
    }
  };

  const handleAtivar = async (id) => {
    if (!user?.id) {
      alert('Usuário não identificado. Faça login novamente.');
      return;
    }
    if (confirm('Tem certeza que deseja ativar este funcionário?')) {
      await api.reativarUsuario(id, user.id, user.role);
      loadUsuarios();
    }
  };

  const openEditModal = (u) => {
    setEditUser(u);
    setEditForm({ username: u.username, role: u.role, nome_completo: u.nome_completo || '' });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditUser(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Usuário não identificado. Faça login novamente.');
      return;
    }
    try {
      await api.atualizarUsuario(editUser.id, editForm, user.id, user.role);
      closeEditModal();
      loadUsuarios();
    } catch (err) {
      alert(err.message || err.error || 'Erro ao atualizar funcionário');
    }
  };

  const getRoleLabel = (role) => {
    const labels = { gerente: 'Gerente', supervisor: 'Supervisor', funcionário: 'Funcionário' };
    return labels[role] || role;
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <PageHeader>
        <Title>Funcionários</Title>
        {(user?.role === 'gerente' || user?.role === 'supervisor') && <Button onClick={openModal}>+ Novo Funcionário</Button>}
      </PageHeader>

      <Table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Usuário</th>
            <th>Função</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 ? (
            <tr><td colSpan="5" style={{ textAlign: 'center' }}>Nenhum funcionário encontrado</td></tr>
          ) : usuarios.map(u => (
            <tr key={u.id}>
              <td>{u.nome_completo}</td>
              <td>{u.username}</td>
              <td><Badge role={u.role}>{getRoleLabel(u.role)}</Badge></td>
              <td>{u.ativo ? 'Ativo' : 'Inativo'}</td>
              <td>
                <Actions>
                  <EditButton onClick={() => openEditModal(u)}>Editar</EditButton>
                  {!(user?.role === 'supervisor' && u.role === 'gerente') && (
                    u.ativo ? (
                      <Button variant="danger" onClick={() => handleDelete(u.id)}>Desativar</Button>
                    ) : (
                      <Button onClick={() => handleAtivar(u.id)}>Ativar</Button>
                    )
                  )}
                </Actions>
              </td>
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

      {modalOpen && (
        <Modal>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h2>Novo Funcionário</h2>
              <Button variant="subtle" onClick={closeModal}>✕</Button>
            </ModalHeader>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>Nome Completo *</Label>
                <Input value={form.nome_completo} onChange={e => setForm({...form, nome_completo: e.target.value})} required />
              </FormGroup>
              <FormGroup>
                <Label>Usuário *</Label>
                <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
              </FormGroup>
              <FormGroup>
                <Label>Senha *</Label>
                <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </FormGroup>
              <FormGroup>
                <Label>Função *</Label>
                <Select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="funcionário">Funcionário</option>
                  {user?.role === 'gerente' && <option value="supervisor">Supervisor</option>}
                  {user?.role === 'gerente' && <option value="gerente">Gerente</option>}
                </Select>
              </FormGroup>
              <Button type="submit">Criar</Button>
            </form>
          </ModalContent>
        </Modal>
      )}

      {editModalOpen && (
        <Modal>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h2>Editar Funcionário</h2>
              <Button variant="subtle" onClick={closeEditModal}>✕</Button>
            </ModalHeader>
            <form onSubmit={handleEditSubmit}>
              <FormGroup>
                <Label>Nome Completo</Label>
                <Input value={editForm.nome_completo} onChange={e => setEditForm({...editForm, nome_completo: e.target.value})} />
              </FormGroup>
              <FormGroup>
                <Label>Usuário</Label>
                <Input value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} />
              </FormGroup>
              {user?.role === 'gerente' && (
                <FormGroup>
                  <Label>Função</Label>
                  <Select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                    <option value="funcionário">Funcionário</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="gerente">Gerente</option>
                  </Select>
                </FormGroup>
              )}
              <Button type="submit">Salvar</Button>
            </form>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}
