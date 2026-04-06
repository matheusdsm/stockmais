import React, { createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from './styles/GlobalStyles';
import { api } from './services/api';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Estoque from './pages/Estoque';
import Movimentacao from './pages/Movimentacao';
import Funcionarios from './pages/Funcionarios';
import Historico from './pages/Historico';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AppContainer = styled.div`
  display: flex;
  min-height: 100vh;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 240px;
`;

const PageContent = styled.main`
  flex: 1;
  padding: ${theme.spacing.lg};
  background: ${theme.colors.background};
`;

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  
  // Visitante pode acessar todas as páginas, mas RequiredRole vai fazer a filtragem
  const roleOrder = { funcionário: 1, supervisor: 2, gerente: 3, visitante: 0 };
  if (requiredRole && roleOrder[user.role] < roleOrder[requiredRole]) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('stockmais_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const userData = await api.login(username, password);
    setUser(userData);
    localStorage.setItem('stockmais_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('stockmais_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppContainer>
              <Sidebar />
              <MainContent>
                <Header />
                <PageContent>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/estoque" element={<Estoque />} />
                    <Route path="/movimentacao" element={<Movimentacao />} />
                    <Route path="/funcionarios" element={
                      <ProtectedRoute>
                        <Funcionarios />
                      </ProtectedRoute>
                    } />
                    <Route path="/historico" element={
                      <ProtectedRoute>
                        <Historico />
                      </ProtectedRoute>
                    } />
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </PageContent>
              </MainContent>
            </AppContainer>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthContext.Provider>
  );
}
