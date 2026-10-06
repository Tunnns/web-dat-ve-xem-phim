import { apiClient } from './client';
import type { ApiResponse, Theater } from './types';

export const getTheaters = async (params?: { search?: string }): Promise<Theater[]> => {
  const res = await apiClient.get<ApiResponse<Theater[]>>('/theaters', { params });
  return res.data.data ?? [];
};

export const createTheater = async (payload: Record<string, unknown>): Promise<void> => {
  await apiClient.post('/theaters', payload);
};

export const updateTheater = async (id: string, payload: Record<string, unknown>): Promise<void> => {
  await apiClient.put(`/theaters/${id}`, payload);
};

export const deleteTheater = async (id: string): Promise<void> => {
  await apiClient.delete(`/theaters/${id}`);
};
