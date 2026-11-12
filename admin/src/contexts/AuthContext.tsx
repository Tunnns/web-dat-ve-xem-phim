
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';
import type {
  AdminUser,
  ApiResponse,
  AuthResult,
  LoginPayload,
} from '../types/auth';

const AUTH_STORAGE_KEY = 'cineops-auth-storage';

const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:5000/api';

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AdminUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const saveAuth = useCallback((authUser: AdminUser, authToken: string) => {
    setUser(authUser);
    setToken(authToken);

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: authUser,
        token: authToken,
      }),
    );
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const login = useCallback(
    async (payload: LoginPayload): Promise<AdminUser> => {
      const response = await axios.post<ApiResponse<AuthResult>>(
        `${AUTH_API_URL}/auth/login`,
        payload,
      );

      const result = response.data.data;

      if (!result?.user || !result.token) {
        throw new Error('Dữ liệu đăng nhập từ máy chủ không hợp lệ');
      }

      if (
        !['admin', 'manager', 'staff'].includes(result.user.role)
      ) {
        throw new Error('Tài khoản này không có quyền truy cập hệ thống quản trị');
      }

      saveAuth(result.user, result.token);
      return result.user;
    },
    [saveAuth],
  );

  useEffect(() => {
    const verifySession = async () => {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);

        if (!saved) {
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(saved) as {
          user?: AdminUser;
          token?: string;
        };

        if (!parsed.token) {
          logout();
          setLoading(false);
          return;
        }

        const response = await axios.get<ApiResponse<AdminUser>>(
          `${AUTH_API_URL}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${parsed.token}`,
            },
          },
        );

        const currentUser = response.data.data;

        if (
          !currentUser ||
          !['admin', 'manager', 'staff'].includes(currentUser.role)
        ) {
          logout();
          setLoading(false);
          return;
        }

        saveAuth(currentUser, parsed.token);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    void verifySession();
  }, [logout, saveAuth]);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }

  return context;
};

