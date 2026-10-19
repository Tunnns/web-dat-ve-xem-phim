import { apiClient } from './client';
import type { ApiResponse, Movie, MovieStatus } from './types';

export const getMovies = async (params?: { status?: MovieStatus; search?: string }): Promise<Movie[]> => {
  const res = await apiClient.get<ApiResponse<Movie[]>>('/movies', { params });
  return res.data.data ?? [];
};

export const createMovie = async (payload: FormData): Promise<void> => {
  await apiClient.post('/movies', payload);
};

export const updateMovie = async (id: string, payload: FormData): Promise<void> => {
  await apiClient.put(`/movies/${id}`, payload);
};

export const deleteMovie = async (id: string): Promise<void> => {
  await apiClient.delete(`/movies/${id}`);
};
