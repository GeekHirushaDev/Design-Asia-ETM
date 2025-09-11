const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

class ApiService {
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // For demo purposes, always succeed
    const user = {
      _id: '1',
      name: 'Demo User',
      email: credentials.email,
      role: 'user' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { success: true, token: 'demo-token', message: 'Login successful', user };
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    // For demo purposes, always succeed
    const user = {
      _id: '1',
      name: userData.name,
      email: userData.email,
      role: 'user' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { success: true, token: 'demo-token', message: 'Registration successful', user };
  }

  async getUsers(): Promise<User[]> {
    // For demo purposes, return mock users
    return [{
      _id: '1',
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'user' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];
  }
}

export const apiService = new ApiService();
