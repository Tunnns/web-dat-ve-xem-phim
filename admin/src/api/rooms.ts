import { apiClient } from './client';
import type { ApiResponse, Room } from './types';

export const getRooms = async (params?: { theater?: string }): Promise<Room[]> => {
  const res = await apiClient.get<ApiResponse<Room[]>>('/rooms', { params });
  return res.data.data ?? [];
};

export const createRoom = async (payload: Record<string, unknown>): Promise<void> => {
  await apiClient.post('/rooms', payload);
};

export const updateRoom = async (id: string, payload: Record<string, unknown>): Promise<void> => {
  await apiClient.put(`/rooms/${id}`, payload);
};

export const deleteRoom = async (id: string): Promise<void> => {
  await apiClient.delete(`/rooms/${id}`);
};
