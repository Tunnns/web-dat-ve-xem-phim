export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Array<{ type?: string; msg: string; path?: string; location?: string }>;
}

export type MovieStatus = 'now_showing' | 'coming_soon' | 'stopped';

export interface Movie {
  _id: string;
  title: string;
  description: string;
  posterUrl: string;
  bannerUrl?: string;
  trailerUrl?: string;
  duration: number;
  releaseDate: string;
  genre: string[];
  director?: string;
  actors: string[];
  status: MovieStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Theater {
  _id: string;
  name: string;
  address: string;
  location?: { lat?: number; lng?: number };
  hotline?: string;
  createdAt: string;
  updatedAt: string;
}

export type SeatType = 'normal' | 'vip' | 'couple';
export type SeatStatus = 'available' | 'maintenance';

export interface Seat {
  _id?: string;
  code: string;
  type: SeatType;
  status: SeatStatus;
}

export interface Room {
  _id: string;
  name: string;
  theater: string | { _id: string; name: string; address: string };
  seatLayout: Seat[];
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface MovieRef {
  _id: string;
  title: string;
  posterUrl?: string;
  duration?: number;
}

export interface TheaterRef {
  _id: string;
  name: string;
  address?: string;
}

export interface RoomRef {
  _id: string;
  name: string;
  capacity?: number;
}

export interface Showtime {
  _id: string;
  movie: string | MovieRef;
  theater: string | TheaterRef;
  room: string | RoomRef;
  startTime: string;
  endTime: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}
