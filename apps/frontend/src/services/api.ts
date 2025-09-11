const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
  constructor() {
    console.log('API Service initialized');
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    console.log('Checking authentication, token:', !!token);
    return !!token;
  }

  setToken(token: string): void {
    console.log('Setting token:', token);
    localStorage.setItem('token', token);
  }

  logout(): void {
    console.log('Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
    return null;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const url = `${API_URL}/auth/login`;
      console.log('Attempting login to:', url);
      console.log('API_URL:', API_URL);
      console.log('Credentials:', { email: credentials.email, password: '***' });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        this.setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Login successful:', data);
        return {
          success: true,
          token: data.token,
          user: data.user,
          message: data.message
        };
      } else {
        console.log('Login failed:', data.message);
        return {
          success: false,
          message: data.message || 'Login failed'
        };
      }
    } catch (error) {
      console.error('Backend login error:', error);
      return {
        success: false,
        message: `Network error: ${error instanceof Error ? error.message : 'Please try again.'}`
      };
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const url = `${API_URL}/auth/register`;
      console.log('Attempting registration to:', url);
      console.log('API_URL:', API_URL);
      console.log('Registration data:', { ...userData, password: '***' });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        this.setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Registration successful:', data);
        return {
          success: true,
          token: data.token,
          user: data.user,
          message: data.message
        };
      } else {
        console.log('Registration failed:', data.message);
        return {
          success: false,
          message: data.message || 'Registration failed'
        };
      }
    } catch (error) {
      console.error('Backend registration error:', error);
      return {
        success: false,
        message: `Network error: ${error instanceof Error ? error.message : 'Please try again.'}`
      };
    }
  }

  async getUsers(): Promise<User[]> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.users || [];
  }

  async getCurrentUserProfile(): Promise<User> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.user;
  }
}

export const apiService = new ApiService();
export default apiService;