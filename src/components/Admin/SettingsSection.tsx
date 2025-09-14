import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Monitor, 
  Sun, 
  Moon,
  Settings,
  Save,
  RotateCcw
} from 'lucide-react';
import { roleApi, userApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

type Theme = 'light' | 'dark' | 'system';

export const SettingsSection: React.FC = () => {
  const { user } = useAuthStore();
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'system';
  });
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Detect system theme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    applyTheme();
  }, [currentTheme, systemPreference]);

  const applyTheme = () => {
    const root = document.documentElement;
    
    let themeToApply: 'light' | 'dark';
    
    if (currentTheme === 'system') {
      themeToApply = systemPreference;
    } else {
      themeToApply = currentTheme;
    }
    
    if (themeToApply === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', currentTheme);
  };

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    toast.success(`Theme changed to ${theme === 'system' ? 'system preference' : theme} mode`);
  };

  const resetSettings = () => {
    setCurrentTheme('system');
    toast.success('Settings reset to defaults');
  };

  const getActiveTheme = (): 'light' | 'dark' => {
    return currentTheme === 'system' ? systemPreference : currentTheme;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Application Settings</h2>
              <p className="text-sm text-gray-600">Customize your application experience</p>
            </div>
          </div>
          <button
            onClick={resetSettings}
            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw size={16} className="mr-2" />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Settings Content */}
      <div className="p-6 space-y-8">
        {/* Theme Settings */}
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <Palette className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">Theme Preferences</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Light Theme */}
            <div
              onClick={() => handleThemeChange('light')}
              className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                currentTheme === 'light'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Sun className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Light Mode</h4>
                  <p className="text-sm text-gray-600">Clean and bright interface</p>
                </div>
              </div>
              
              {/* Theme Preview */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="h-2 bg-gray-100 rounded"></div>
                <div className="h-2 bg-blue-500 rounded w-3/4"></div>
                <div className="h-2 bg-gray-100 rounded w-1/2"></div>
              </div>
              
              {currentTheme === 'light' && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Save className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Dark Theme */}
            <div
              onClick={() => handleThemeChange('dark')}
              className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                currentTheme === 'dark'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gray-800 rounded-lg">
                  <Moon className="h-5 w-5 text-gray-100" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Dark Mode</h4>
                  <p className="text-sm text-gray-600">Easy on the eyes</p>
                </div>
              </div>
              
              {/* Theme Preview */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                <div className="h-2 bg-gray-700 rounded"></div>
                <div className="h-2 bg-blue-400 rounded w-3/4"></div>
                <div className="h-2 bg-gray-700 rounded w-1/2"></div>
              </div>
              
              {currentTheme === 'dark' && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Save className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* System Theme */}
            <div
              onClick={() => handleThemeChange('system')}
              className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                currentTheme === 'system'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-yellow-100 to-gray-800 rounded-lg">
                  <Monitor className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">System</h4>
                  <p className="text-sm text-gray-600">Follow system preference</p>
                </div>
              </div>
              
              {/* Theme Preview */}
              <div className="bg-gradient-to-r from-white to-gray-800 border border-gray-300 rounded-lg p-3 space-y-2">
                <div className="h-2 bg-gradient-to-r from-gray-100 to-gray-700 rounded"></div>
                <div className="h-2 bg-blue-500 rounded w-3/4"></div>
                <div className="h-2 bg-gradient-to-r from-gray-100 to-gray-700 rounded w-1/2"></div>
              </div>
              
              {currentTheme === 'system' && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Save className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Current Theme</h4>
                <p className="text-sm text-gray-600">
                  Active: {getActiveTheme() === 'light' ? 'Light Mode' : 'Dark Mode'}
                  {currentTheme === 'system' && ` (System: ${systemPreference})`}
                </p>
              </div>
              <div className={`w-4 h-4 rounded-full ${getActiveTheme() === 'light' ? 'bg-yellow-400' : 'bg-gray-700'}`}></div>
            </div>
          </div>
        </div>

        {/* Additional Settings Sections */}
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Application Preferences</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Auto-save Settings</h4>
                <p className="text-sm text-gray-600">Automatically save your preferences</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Real-time Updates</h4>
                <p className="text-sm text-gray-600">Receive live updates for tasks and notifications</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Location Tracking</h4>
                <p className="text-sm text-gray-600">Enable location-based features</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};