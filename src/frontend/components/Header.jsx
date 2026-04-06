import React from 'react';
import styled from 'styled-components';
import { theme } from '../styles/GlobalStyles';
import { useAuth } from '../App';

const HeaderContainer = styled.header`
  height: 56px;
  background: ${theme.colors.surface};
  border-bottom: 1px solid ${theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 ${theme.spacing.lg};
`;

const UserName = styled.span`
  margin-right: ${theme.spacing.md};
  color: ${theme.colors.neutral};
`;

const LogoutButton = styled.button`
  background: transparent;
  border: 1px solid ${theme.colors.border};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius};
  color: ${theme.colors.neutral};
  transition: all 0.2s;
  
  &:hover {
    background: ${theme.colors.danger};
    color: white;
    border-color: ${theme.colors.danger};
  }
`;

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <HeaderContainer>
      <UserName>{user?.nome_completo}</UserName>
      <LogoutButton onClick={logout}>Sair</LogoutButton>
    </HeaderContainer>
  );
}
