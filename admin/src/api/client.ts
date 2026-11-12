
import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/admin';

// Key lưu phiên đăng nhập riêng của ứng dụng Admin
export const ADMIN_AUTH_STORAGE = 'cineops-auth-storage';

export const apiClient = axios.create({
  baseURL,
  timeout: 20000,
});

// Tự động lấy JWT và gửi lên Backend
apiClient.interceptors.request.use(
  (config) => {
    try {
      const savedAuth = localStorage.getItem(ADMIN_AUTH_STORAGE);

      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);

        // Hỗ trợ cấu trúc Zustand persist và cấu trúc thông thường
        const token =
          parsed?.state?.token ??
          parsed?.token ??
          null;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Dữ liệu đăng nhập lỗi thì không gửi token
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Tự xử lý khi token hết hạn hoặc không hợp lệ
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(ADMIN_AUTH_STORAGE);

      // Chỉ chuyển hướng nếu đang ở ứng dụng Admin
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

interface ValidationError {
  msg?: string;
  path?: string;
}

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string;
          error?: string;
          errors?: ValidationError[];
        }
      | undefined;

    if (data?.errors && data.errors.length > 0) {
      return data.errors
        .map((item) => item.msg ?? 'Dữ liệu không hợp lệ')
        .join('; ');
    }

    if (data?.message) return data.message;
    if (data?.error) return data.error;

    if (!error.response) {
      return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra backend.';
    }

    return error.message;
  }

  if (error instanceof Error) return error.message;

  return 'Đã xảy ra lỗi không xác định';
};

// Lấy dữ liệu danh sách từ API
const getList = async (endpoint: string): Promise<any[]> => {
  const response = await apiClient.get(endpoint);
  const result = response.data?.data ?? response.data;

  return Array.isArray(result) ? result : [];
};

// Danh sách phim
export const getMovies = () => getList('/movies');

// Danh sách rạp
export const getTheaters = () => getList('/theaters');

// Danh sách phòng chiếu
export const getRooms = () => getList('/rooms');

// Danh sách suất chiếu
export const getShowtimes = () => getList('/showtimes');

// Danh sách vé đặt
export const getTickets = () => getList('/tickets');

// Báo cáo thống kê doanh thu
export const getRevenue = (params?: {
  startDate?: string;
  endDate?: string;
  theaterId?: string;
  movieId?: string;
  paymentMethod?: string;
}) => apiClient.get('/revenue', { params });

// Quản lý mã giảm giá (Vouchers)
export const getVouchers = () => getList('/vouchers');
export const getVoucherById = (id: string) => apiClient.get(`/vouchers/${id}`);
export const createVoucher = (payload: any) => apiClient.post('/vouchers', payload);
export const updateVoucher = (id: string, payload: any) => apiClient.put(`/vouchers/${id}`, payload);
export const deleteVoucher = (id: string) => apiClient.delete(`/vouchers/${id}`);

// Quản lý Combo bắp nước
export const getCombos = () => getList('/combos');
export const getComboById = (id: string) => apiClient.get(`/combos/${id}`);
export const createCombo = (payload: any) => apiClient.post('/combos', payload);
export const updateCombo = (id: string, payload: any) => apiClient.put(`/combos/${id}`, payload);
export const deleteCombo = (id: string) => apiClient.delete(`/combos/${id}`);
export const uploadComboImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await apiClient.post('/combos/upload', formData);
  return res.data?.data?.imageUrl || res.data?.imageUrl;
};
