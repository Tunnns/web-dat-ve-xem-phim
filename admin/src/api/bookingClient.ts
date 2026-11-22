import axios from 'axios';

const adminBaseURL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/admin';

// Tách /admin để lấy API gốc: http://localhost:5000/api
const apiRoot = adminBaseURL.replace(/\/admin\/?$/, '');

export const bookingClient = axios.create({
  baseURL: apiRoot,
  timeout: 20000,
});

// Dùng chung token đăng nhập CineOps
bookingClient.interceptors.request.use(
  (config) => {
    try {
      const savedAuth = localStorage.getItem('cineops-auth-storage');

      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        const token = parsed?.state?.token ?? parsed?.token ?? null;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Không gửi token nếu dữ liệu lưu bị lỗi
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export default bookingClient;