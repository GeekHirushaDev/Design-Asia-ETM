import React, { useState } from 'react';
import { CheckSquare, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../lib/api';
import { socketManager } from '../../lib/socket';
import toast from 'react-hot-toast';

export const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      const response = await authApi.login(formData);
      const { user, accessToken, refreshToken } = response.data;
      
      setAuth(user, accessToken, refreshToken);
      socketManager.connect(accessToken);
      
      toast.success('Login successful!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'employee') => {
    const demoCredentials = {
      admin: { email: 'admin@company.com', password: 'admin123' },
      employee: { email: 'employee1@taskmanager.com', password: 'employee123' },
    };

    setFormData(demoCredentials[role]);
    
    try {
      setIsLoading(true);
      const response = await authApi.login(demoCredentials[role]);
      const { user, accessToken, refreshToken } = response.data;
      
      setAuth(user, accessToken, refreshToken);
      socketManager.connect(accessToken);
      
      toast.success(`Logged in as ${role}!`);
    } catch (error: any) {
      toast.error('Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
            <CheckSquare size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">TaskFlow</h1>
          <p className="text-gray-600 mt-2">Sign in to manage your tasks</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Buttons */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-4">Try the demo:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDemoLogin('admin')}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 transition-colors font-medium"
              >
                Admin Demo
                <div className="text-xs opacity-75 mt-1">admin@company.com</div>
              </button>
              <button
                onClick={() => handleDemoLogin('employee')}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors font-medium"
              >
                Employee Demo
                <div className="text-xs opacity-75 mt-1">employee1@taskmanager.com</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2024 TaskFlow. Built with modern web technologies.</p>
        </div>
      </div>
    </div>
  );
};