import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, ApiResponse } from '../types';
import { authApi } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string; refreshToken: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateProfile: (data: any) => Promise<void>;
  updateLocation: (locationData: any) => Promise<void>;
  changePassword: (passwordData: any) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          dispatch({ type: 'AUTH_START' });
          const response: ApiResponse<{ user: User }> = await authApi.getMe();
          
          if (response.success && response.data) {
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                user: response.data.user,
                token: token,
                refreshToken: localStorage.getItem('refreshToken') || '',
              },
            });
          } else {
            throw new Error('Failed to get user data');
          }
        } catch (error: any) {
          dispatch({ type: 'AUTH_FAILURE', payload: error.message });
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response: ApiResponse<{
        user: User;
        token: string;
        refreshToken: string;
      }> = await authApi.login({ email, password });

      if (response.success && response.data) {
        const { user, token, refreshToken } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token, refreshToken },
        });
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.response?.data?.message || error.message || 'Login failed',
      });
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response: ApiResponse<{
        user: User;
        token: string;
        refreshToken: string;
      }> = await authApi.register(userData);

      if (response.success && response.data) {
        const { user, token, refreshToken } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token, refreshToken },
        });
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.response?.data?.message || error.message || 'Registration failed',
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    dispatch({ type: 'LOGOUT' });
  };

  const updateProfile = async (data: any) => {
    try {
      const response: ApiResponse<{ user: User }> = await authApi.updateProfile(data);
      
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_USER', payload: response.data.user });
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Profile update failed');
    }
  };

  const updateLocation = async (locationData: any) => {
    try {
      const response = await authApi.updateLocation(locationData);
      
      if (response.success) {
        // Update user's location in state if needed
        if (state.user) {
          const updatedUser = {
            ...state.user,
            location: locationData,
            batteryLevel: locationData.batteryLevel || state.user.batteryLevel,
          };
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        }
      } else {
        throw new Error(response.message || 'Location update failed');
      }
    } catch (error: any) {
      console.error('Location update error:', error);
      // Don't throw here to prevent disrupting the app
    }
  };

  const changePassword = async (passwordData: any) => {
    try {
      const response = await authApi.changePassword(passwordData);
      
      if (!response.success) {
        throw new Error(response.message || 'Password change failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Password change failed');
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    updateLocation,
    changePassword,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
