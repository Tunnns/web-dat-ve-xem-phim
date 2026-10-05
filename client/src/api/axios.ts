import axios, { AxiosError } from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
})

// Tự động gắn token vào mọi request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Token hết hạn / không hợp lệ -> đăng xuất
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; errors?: { msg: string }[] }
      | undefined
    if (data?.errors?.length) return data.errors.map((e) => e.msg).join('. ')
    if (data?.message) return data.message
    if (!error.response) return 'Không thể kết nối tới máy chủ'
  }
  return 'Đã có lỗi xảy ra, vui lòng thử lại'
}

export default api
