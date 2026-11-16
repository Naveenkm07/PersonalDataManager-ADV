import React, { createContext, useContext, useState, useEffect } from 'react';
import LoadingScreen from '../components/LoadingScreen';
import { auth } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, otp?: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token && token.split('.').length === 3) {
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error('Stored session is no longer valid');
          const account = await response.json();
          setUser({ id: account._id, username: account.name, email: account.email, role: account.role });
        } else {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('isLoggedIn');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string, otp?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const userData = await auth.login(email, password, otp);
      if (userData.mfaRequired) throw new Error('MFA_REQUIRED');
      setUser(userData.user);
      localStorage.setItem('user', JSON.stringify(userData.user));
      localStorage.setItem('isLoggedIn', 'true');
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === 'MFA_REQUIRED') throw error;
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const userData = await auth.register(email, password);
      setUser(userData.user);
      localStorage.setItem('user', JSON.stringify(userData.user));
      localStorage.setItem('isLoggedIn', 'true');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
