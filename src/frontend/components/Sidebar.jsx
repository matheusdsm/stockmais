import React from 'react';
import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import { theme } from '../styles/GlobalStyles';
import { useAuth } from '../App';

const SidebarContainer = styled.aside`
  width: 240px;
  height: 100vh;
  background: ${theme.colors.surface};
  border-right: 1px solid ${theme.colors.border};
  position: fixed;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
`;

const Logo = styled.div`
  padding: ${theme.spacing.lg};
  font-size: 20px;
  font-weight: 700;
  color: ${theme.colors.primary};
  border-bottom: 1px solid ${theme.colors.border};
`;

const Nav = styled.nav`
  flex: 1;
  padding: ${theme.spacing.md} 0;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  color: ${theme.colors.neutral};
  transition: all 0.2s;
  
  &:hover {
    background: ${theme.colors.background};
    color: ${theme.colors.primary};
  }
  
  &.active {
    background: ${theme.colors.background};
    color: ${theme.colors.primary};
    border-right: 3px solid ${theme.colors.primary};
  }
`;

const UserInfo = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.border};
  font-size: ${theme.fontSize.small};
  color: ${theme.colors.textSecondary};
`;

export default function Sidebar() {
  const { user } = useAuth();
  
  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/estoque', label: 'Estoque', icon: '📦' },
    { to: '/movimentacao', label: 'Movimentação', icon: '🔄' },
  ];
  
  // Apenas supervisors e gerentes podem ver funcionários
  if (user?.role === 'supervisor' || user?.role === 'gerente') {
    links.push({ to: '/funcionarios', label: 'Funcionários', icon: '👥' });
  }
  
  // Todos usuários podem ver histórico (incluindo visitante)
  links.push({ to: '/historico', label: 'Histórico', icon: '📋' });

  return (
    <SidebarContainer>
      <Logo>STOCKMAIS</Logo>
      <Nav>
        {links.map(link => (
          <NavItem key={link.to} to={link.to}>
            <span>{link.icon}</span>
            {link.label}
          </NavItem>
        ))}
      </Nav>
      <UserInfo>
        Logado como: <strong>{user?.nome_completo}</strong>
        <br />
        ({user?.role})
      </UserInfo>
    </SidebarContainer>
  );
}
