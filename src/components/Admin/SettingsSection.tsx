import React, { useState, useEffect } from 'react';
import { Settings, Palette, Globe, Bell, Shield, Database, Save, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsData {
  theme: 'light' | 'dark' | 'auto';
  accentColor: string;
  timezone: string;
  dateFormat: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReports: boolean;
  language: string;
  sessionTimeout: number;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
}

const SettingsModal: React.FC<{
  category: string;
  onClose: () => void;
  onSave: (data: any) => void;
  data: any;
}> = ({ category, onClose, onSave, data }) => {
  const [formData, setFormData] = useState(data);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSave(formData);
      toast.success('Settings saved successfully');
      
      // Force a small delay to ensure settings are applied
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      onClose();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (category) {
      case 'appearance':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accent Color
              </label>
              <div className="grid grid-cols-6 gap-3">
                {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, accentColor: color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.accentColor === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </>
        );
      
      case 'localization':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Asia/Colombo">Asia/Colombo (Sri Lanka)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Format
              </label>
              <select
                value={formData.dateFormat}
                onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="si">සිංහල (Sinhala)</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
            </div>
          </>
        );
      
      case 'notifications':
        return (
          <>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.emailNotifications}
                  onChange={(e) => setFormData({ ...formData, emailNotifications: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Email Notifications</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.pushNotifications}
                  onChange={(e) => setFormData({ ...formData, pushNotifications: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Push Notifications</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.weeklyReports}
                  onChange={(e) => setFormData({ ...formData, weeklyReports: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Weekly Reports</span>
              </label>
              
              <div className="pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={testNotification}
                  className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  Test Notification
                </button>
              </div>
            </div>
          </>
        );
      
      case 'security':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="480"
                value={formData.sessionTimeout}
                onChange={(e) => setFormData({ ...formData, sessionTimeout: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        );
      
      case 'backup':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Frequency
              </label>
              <select
                value={formData.backupFrequency}
                onChange={(e) => setFormData({ ...formData, backupFrequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4 capitalize">{category} Settings</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderFormFields()}
          
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Save Settings
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const SettingsSection: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    theme: 'light',
    accentColor: '#3b82f6',
    timezone: 'Asia/Colombo',
    dateFormat: 'DD/MM/YYYY',
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: false,
    language: 'en',
    sessionTimeout: 60,
    backupFrequency: 'weekly',
  });
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    // Apply saved settings on component mount
    applyTheme(settings.theme);
    applyAccentColor(settings.accentColor);
  }, []);

  useEffect(() => {
    // Apply settings when they change
    applyTheme(settings.theme);
    applyAccentColor(settings.accentColor);
  }, [settings.theme, settings.accentColor]);
  const loadSettings = async () => {
    try {
      // Load settings from localStorage for now
      const savedSettings = localStorage.getItem('taskmanager-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        
        // Apply loaded settings immediately
        applyTheme(parsed.theme);
        applyAccentColor(parsed.accentColor);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (categoryData: any) => {
    const updatedSettings = { ...settings, ...categoryData };
    setSettings(updatedSettings);
    
    // Save to localStorage
    localStorage.setItem('taskmanager-settings', JSON.stringify(updatedSettings));
    
    // Apply theme immediately
    if (categoryData.theme) {
      applyTheme(categoryData.theme);
    }
    
    // Apply accent color
    if (categoryData.accentColor) {
      applyAccentColor(categoryData.accentColor);
    }
    
    // Apply other settings
    if (categoryData.timezone) {
      // Store timezone preference
      localStorage.setItem('user-timezone', categoryData.timezone);
    }
    
    if (categoryData.language) {
      // Store language preference
      localStorage.setItem('user-language', categoryData.language);
    }
    
    if (categoryData.dateFormat) {
      // Store date format preference
      localStorage.setItem('user-date-format', categoryData.dateFormat);
    }
    
    // Handle notification settings
    if (categoryData.pushNotifications !== undefined) {
      if (categoryData.pushNotifications) {
        // Enable push notifications
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
          toast.error('Push notification permission denied');
          setSettings(prev => ({ ...prev, pushNotifications: false }));
          localStorage.setItem('taskmanager-settings', JSON.stringify({ ...updatedSettings, pushNotifications: false }));
        }
      }
    }
  };

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('dark', 'light');
    
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#1f2937';
      document.body.style.color = '#f9fafb';
    } else if (theme === 'light') {
      root.classList.add('light');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#111827';
    } else {
      // Auto theme - check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        document.body.style.backgroundColor = '#1f2937';
        document.body.style.color = '#f9fafb';
      } else {
        root.classList.add('light');
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#111827';
      }
    }
  };

  const applyAccentColor = (color: string) => {
    const root = document.documentElement;
    
    // Apply accent color to CSS custom properties
    root.style.setProperty('--color-primary', color);
    root.style.setProperty('--color-primary-50', `${color}10`);
    root.style.setProperty('--color-primary-100', `${color}20`);
    root.style.setProperty('--color-primary-500', color);
    root.style.setProperty('--color-primary-600', color);
    root.style.setProperty('--color-primary-700', color);
    
    // Update button colors dynamically
    const buttons = document.querySelectorAll('.btn-primary, .bg-blue-600, .bg-blue-500');
    buttons.forEach(button => {
      (button as HTMLElement).style.backgroundColor = color;
    });
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('TaskFlow Test', {
        body: 'Notifications are working correctly!',
        icon: '/favicon.ico',
      });
      toast.success('Test notification sent');
    } else {
      toast.error('Notification permission not granted');
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'taskmanager-settings.json';
    link.click();
    
    URL.revokeObjectURL(url);
    toast.success('Settings exported successfully');
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(importedSettings);
        localStorage.setItem('taskmanager-settings', JSON.stringify(importedSettings));
        toast.success('Settings imported successfully');
        
        // Apply imported theme and colors
        applyTheme(importedSettings.theme);
        applyAccentColor(importedSettings.accentColor);
      } catch (error) {
        toast.error('Invalid settings file');
      }
    };
    reader.readAsText(file);
  };

  const settingsCategories = [
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize the look and feel of the application',
      icon: Palette,
      data: {
        theme: settings.theme,
        accentColor: settings.accentColor,
      },
    },
    {
      id: 'localization',
      title: 'Localization',
      description: 'Set your timezone, language, and date formats',
      icon: Globe,
      data: {
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        language: settings.language,
      },
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage your notification preferences',
      icon: Bell,
      data: {
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        weeklyReports: settings.weeklyReports,
      },
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Configure security and session settings',
      icon: Shield,
      data: {
        sessionTimeout: settings.sessionTimeout,
      },
    },
    {
      id: 'backup',
      title: 'Backup & Data',
      description: 'Manage data backup and export settings',
      icon: Database,
      data: {
        backupFrequency: settings.backupFrequency,
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600">Customize your task management experience</p>
        </div>
        
        <div className="flex gap-2">
          <label className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
            <Upload size={16} className="mr-2" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={importSettings}
              className="hidden"
            />
          </label>
          
          <button
            onClick={exportSettings}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={16} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Settings Categories */}
      <div className="grid gap-6">
        {settingsCategories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <category.icon className="w-6 h-6 text-blue-600" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
                  <p className="text-gray-600 text-sm">{category.description}</p>
                </div>
              </div>
              
              <button
                onClick={() => setEditingCategory(category.id)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Configure
              </button>
            </div>
            
            {/* Current Settings Preview */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                {category.id === 'appearance' && (
                  <div className="flex items-center gap-4">
                    <span>Theme: <strong className="capitalize">{settings.theme}</strong></span>
                    <div className="flex items-center gap-2">
                      <span>Color:</span>
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: settings.accentColor }}
                      />
                    </div>
                  </div>
                )}
                
                {category.id === 'localization' && (
                  <div>
                    Timezone: <strong>{settings.timezone}</strong> | 
                    Date: <strong>{settings.dateFormat}</strong> | 
                    Language: <strong>{settings.language.toUpperCase()}</strong>
                  </div>
                )}
                
                {category.id === 'notifications' && (
                  <div>
                    Email: <strong>{settings.emailNotifications ? 'On' : 'Off'}</strong> | 
                    Push: <strong>{settings.pushNotifications ? 'On' : 'Off'}</strong> | 
                    Reports: <strong>{settings.weeklyReports ? 'On' : 'Off'}</strong>
                  </div>
                )}
                
                {category.id === 'security' && (
                  <div>
                    Session timeout: <strong>{settings.sessionTimeout} minutes</strong>
                  </div>
                )}
                
                {category.id === 'backup' && (
                  <div>
                    Backup frequency: <strong className="capitalize">{settings.backupFrequency}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Settings Modal */}
      {editingCategory && (
        <SettingsModal
          category={editingCategory}
          data={settingsCategories.find(c => c.id === editingCategory)?.data}
          onClose={() => setEditingCategory(null)}
          onSave={saveSettings}
        />
      )}
    </div>
  );
};