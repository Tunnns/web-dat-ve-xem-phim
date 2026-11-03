import api from './axios'
import type {
  ApiResponse,
  AuthResult,
  LoginPayload,
  RegisterPayload,
  User,
} from '../types/auth'

// Endpoint backend: /api/auth/{login,register,forgot-password,reset-password,me}
//   POST /auth/login            { email, password }
//   POST /auth/register         { fullName, email, phone?, password }
//   POST /auth/forgot-password  { email }
export const authApi = {
  login: async (payload: LoginPayload) =>
    (await api.post<ApiResponse<AuthResult>>('/auth/login', payload)).data,

  register: async (payload: RegisterPayload) =>
    (await api.post<ApiResponse<AuthResult>>('/auth/register', payload)).data,

  forgotPassword: async (email: string) =>
    (await api.post<ApiResponse>('/auth/forgot-password', { email })).data,

  resetPassword: async (token: string, password: string) =>
    (await api.post<ApiResponse>('/auth/reset-password', { token, password })).data,

  me: async () => (await api.get<ApiResponse<User>>('/auth/me')).data,
}
