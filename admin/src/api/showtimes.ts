import { apiClient } from './client';
import type { ApiResponse, Showtime } from './types';

export const getShowtimes = async (params?: {
  movie?: string;
  theater?: string;
  room?: string;
}): Promise<Showtime[]> => {
  const res = await apiClient.get<ApiResponse<Showtime[]>>('/showtimes', { params });
  return res.data.data ?? [];
};

export const createShowtime = async (payload: Record<string, unknown>): Promise<void> => {
  await apiClient.post('/showtimes', payload);
};

export const updateShowtime = async (id: string, payload: Record<string, unknown>): Promise<void> => {
  await apiClient.put(`/showtimes/${id}`, payload);
};

export const deleteShowtime = async (id: string): Promise<void> => {
  await apiClient.delete(`/showtimes/${id}`);
};
