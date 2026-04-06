import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/GlobalStyles';
import { useAuth } from '../App';

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.background};
`;

const LoginCard = styled.div`
  background: ${theme.colors.surface};
  padding: ${theme.spacing.xl};
  border-radius: ${theme.borderRadius};
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  width: 400px;
`;

const Logo = styled.h1`
  text-align: center;
  color: ${theme.colors.primary};
  margin-bottom: ${theme.spacing.lg};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
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

const Input = styled.input`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius};
  font-size: ${theme.fontSize.body};
  
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
  font-size: ${theme.fontSize.body};
  transition: background 0.2s;
  
  &:hover {
    background: ${theme.colors.primaryHover};
  }
  
  &:disabled {
    background: ${theme.colors.neutralLight};
    cursor: not-allowed;
  }
`;

const Error = styled.p`
  color: ${theme.colors.danger};
  font-size: ${theme.fontSize.small};
`;

const HelpText = styled.p`
  margin-top: ${theme.spacing.md};
  text-align: center;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.small};
`;

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitante = async () => {
    setError('');
    setLoading(true);
    try {
      await login('visitante', 'visitante');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>STOCKMAIS</Logo>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Usuário</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </FormGroup>
          {error && <Error>{error}</Error>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
          <Button type="button" variant="subtle" onClick={handleVisitante} disabled={loading}>
            Entrar como Visitante
          </Button>
        </Form>
        <HelpText>
          Não possui cadastro? Contate com o supervisor
        </HelpText>
      </LoginCard>
    </LoginContainer>
  );
}
