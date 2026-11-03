export interface User {
  _id: string
  fullName: string
  email: string
  phone?: string
  role?: 'user' | 'admin'
  avatar?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  fullName: string
  email: string
  phone?: string
  password: string
}

export interface AuthResult {
  user: User
  token: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
}
