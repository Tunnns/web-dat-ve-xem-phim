
import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/admin';

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

// Hàm lấy dữ liệu danh sách từ API
const getList = async (endpoint: string): Promise<any[]> => {
  const response = await apiClient.get(endpoint);

  const result = response.data?.data ?? response.data;

  if (Array.isArray(result)) {
    return result;
  }

  return [];
};

// Danh sách phim
export const getMovies = () => getList('/movies');

// Danh sách rạp
export const getTheaters = () => getList('/theaters');

// Danh sách phòng chiếu
export const getRooms = () => getList('/rooms');

// Danh sách suất chiếu
export const getShowtimes = () => getList('/showtimes');
