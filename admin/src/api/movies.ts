import { apiClient } from './client';
import type { ApiResponse, Movie, MovieStatus } from './types';

interface UploadPosterResponse {
  message?: string;
  data?: {
    filename: string;
    posterUrl: string;
    imageUrl?: string;
  };
}

export const getMovies = async (params?: {
  status?: MovieStatus;
  search?: string;
}): Promise<Movie[]> => {
  const res = await apiClient.get<ApiResponse<Movie[]>>('/movies', {
    params,
  });

  return res.data.data ?? [];
};

export const createMovie = async (
  payload: Record<string, unknown>,
): Promise<void> => {
  await apiClient.post('/movies', payload);
};

export const updateMovie = async (
  id: string,
  payload: Record<string, unknown>,
): Promise<void> => {
  await apiClient.put(`/movies/${id}`, payload);
};

export const deleteMovie = async (id: string): Promise<void> => {
  await apiClient.delete(`/movies/${id}`);
};

/**
 * Tải ảnh poster lên backend và trả về đường dẫn ảnh.
 */
export const uploadMoviePoster = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('poster', file);

  const res = await apiClient.post<UploadPosterResponse>(
    '/movies/upload',
    formData,
  );

  const posterUrl = res.data.data?.posterUrl;

  if (!posterUrl) {
    throw new Error('Backend không trả về đường dẫn ảnh poster.');
  }

  return posterUrl;
};
