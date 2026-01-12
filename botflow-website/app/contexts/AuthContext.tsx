'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  organizationId: string | null;
  whatsappAccountId: string | null;
  isAuthenticated: boolean;
  login: (token: string, orgId: string, waId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [whatsappAccountId, setWhatsappAccountId] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage on mount
    const storedToken = localStorage.getItem('token');
    const storedOrgId = localStorage.getItem('organizationId');
    const storedWaId = localStorage.getItem('whatsappAccountId');

    if (storedToken) setToken(storedToken);
    if (storedOrgId) setOrganizationId(storedOrgId);
    if (storedWaId) setWhatsappAccountId(storedWaId);
  }, []);

  const login = (newToken: string, orgId: string, waId: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('organizationId', orgId);
    localStorage.setItem('whatsappAccountId', waId);

    setToken(newToken);
    setOrganizationId(orgId);
    setWhatsappAccountId(waId);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('whatsappAccountId');

    setToken(null);
    setOrganizationId(null);
    setWhatsappAccountId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        organizationId,
        whatsappAccountId,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
