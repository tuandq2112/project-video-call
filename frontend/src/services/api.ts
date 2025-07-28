import axios from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage');
  if (token) {
    try {
      const authData = JSON.parse(token);
      if (authData.state?.token) {
        config.headers.Authorization = `Bearer ${authData.state.token}`;
      }
    } catch (error) {
      console.error('Error parsing auth token:', error);
    }
  }
  return config;
});

export const authAPI = {
  register: async (data: RegisterRequest): Promise<{ message: string }> => {
    const response = await api.post('/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/login', data);
    return response.data;
  },
};

export const userAPI = {
  getOnlineUsers: async (): Promise<{ users: User[] }> => {
    const response = await api.get('/users');
    return response.data;
  },
};

export default api; 