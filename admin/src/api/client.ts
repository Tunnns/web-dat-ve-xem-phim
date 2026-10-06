import axios from 'axios';

// Base URL của backend Admin API. Có thể ghi đè bằng biến môi trường VITE_API_URL.
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/admin';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

interface ValidationError {
  msg?: string;
  path?: string;
}

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string; errors?: ValidationError[] }
      | undefined;

    if (data?.errors && data.errors.length > 0) {
      return data.errors.map((item) => item.msg ?? 'Dữ liệu không hợp lệ').join('; ');
    }
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (!error.response) return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra backend.';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi không xác định';
};
