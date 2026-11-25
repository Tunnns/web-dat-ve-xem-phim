import React, { createContext, useContext, useState, useEffect } from 'react';
import { StaffUser, Theater } from '../types';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: StaffUser | null;
  token: string | null;
  theaters: Theater[];
  selectedTheater: Theater | null;
  setSelectedTheater: (theater: Theater | null) => void;
  login: (token: string, user: StaffUser) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [selectedTheater, setSelectedTheater] = useState<Theater | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('staff_token');
    const savedUser = localStorage.getItem('staff_user');
    const savedTheater = localStorage.getItem('staff_theater');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        if (savedTheater) {
          setSelectedTheater(JSON.parse(savedTheater));
        }
      } catch (err) {
        console.error('Failed to parse saved auth:', err);
        localStorage.removeItem('staff_token');
        localStorage.removeItem('staff_user');
      }
    }
    setLoading(false);
  }, []);

  // Tải danh sách rạp để nhân viên chọn rạp đang làm việc
  useEffect(() => {
    if (token) {
      apiClient.get('/admin/theaters')
        .then((res) => {
          const list: Theater[] = res.data.data || [];
          setTheaters(list);
          if (list.length > 0 && !selectedTheater) {
            setSelectedTheater(list[0]);
            localStorage.setItem('staff_theater', JSON.stringify(list[0]));
          }
        })
        .catch((err) => {
          console.error('Lỗi tải danh sách rạp:', err);
        });
    }
  }, [token]);

  const handleSetTheater = (theater: Theater | null) => {
    setSelectedTheater(theater);
    if (theater) {
      localStorage.setItem('staff_theater', JSON.stringify(theater));
    } else {
      localStorage.removeItem('staff_theater');
    }
  };

  const login = (authToken: string, authUser: StaffUser) => {
    setToken(authToken);
    setUser(authUser);
    localStorage.setItem('staff_token', authToken);
    localStorage.setItem('staff_user', JSON.stringify(authUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSelectedTheater(null);
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_user');
    localStorage.removeItem('staff_theater');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        theaters,
        selectedTheater,
        setSelectedTheater: handleSetTheater,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
