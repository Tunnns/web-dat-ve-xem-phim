
export type UserRole = 'admin' | 'manager' | 'staff' | 'user';

export interface AdminUser {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResult {
  user: AdminUser;
  token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  staff: 'Nhân viên',
  user: 'Khách hàng',
};
