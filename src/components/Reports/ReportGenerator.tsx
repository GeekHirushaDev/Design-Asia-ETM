import React, { useState } from 'react';
import { Download, Calendar, Users, FileText, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { reportsApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface ReportConfig {
  type: 'weekly' | 'custom' | 'task_performance' | 'attendance';
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    userId?: string;
    priority?: string;
    status?: string;
  };
}

export const ReportGenerator: React.FC = () => {
  const { user } = useAuthStore();
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    type: 'weekly',
    dateRange: {
      start: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
      end: format(endOfWeek(new Date()), 'yyyy-MM-dd'),
    },
    filters: {},
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTypes = [
    {
      id: 'weekly',
      name: 'Weekly Summary',
      description: 'Comprehensive weekly performance report',
      icon: Calendar,
    },
    {
      id: 'task_performance',
      name: 'Task Performance',
      description: 'Detailed task completion and time analysis',
      icon: TrendingUp,
    },
    {
      id: 'attendance',
      name: 'Attendance Report',
      description: 'Employee attendance and time tracking',
      icon: Users,
    },
    {
      id: 'custom',
      name: 'Custom Report',
      description: 'Build your own custom report',
      icon: FileText,
    },
  ];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      let response;
      
      if (reportConfig.type === 'weekly') {
        response = await reportsApi.generateWeekly();
      } else {
        response = await reportsApi.generateCustom(reportConfig);
      }
      
      toast.success('Report generated successfully!');
      console.log('Report data:', response.data);
      
      // In a real implementation, you would download the PDF
      // For now, we'll just show the success message
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateDateRange = (type: string) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (type) {
      case 'today':
        start = end = now;
        break;
      case 'yesterday':
        start = end = subDays(now, 1);
        break;
      case 'last7days':
        start = subDays(now, 7);
        end = now;
        break;
      case 'last30days':
        start = subDays(now, 30);
        end = now;
        break;
      case 'thisWeek':
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      default:
        return;
    }

    setReportConfig(prev => ({
      ...prev,
      dateRange: {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      },
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report Generator</h1>
        <p className="text-gray-600">Generate comprehensive reports and analytics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Type Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      reportConfig.type === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setReportConfig(prev => ({ ...prev, type: type.id as any }))}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon size={24} className={reportConfig.type === type.id ? 'text-blue-600' : 'text-gray-600'} />
                      <div>
                        <h3 className="font-medium text-gray-900">{type.name}</h3>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {[
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'last7days', label: 'Last 7 Days' },
                { key: 'last30days', label: 'Last 30 Days' },
                { key: 'thisWeek', label: 'This Week' },
              ].map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => updateDateRange(preset.key)}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={reportConfig.dateRange.start}
                  onChange={(e) => setReportConfig(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={reportConfig.dateRange.end}
                  onChange={(e) => setReportConfig(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          {((user as any)?.isSuperAdmin || user?.role === 'admin') && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={reportConfig.filters.priority || ''}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      filters: { ...prev.filters, priority: e.target.value || undefined }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={reportConfig.filters.status || ''}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      filters: { ...prev.filters, status: e.target.value || undefined }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee
                  </label>
                  <select
                    value={reportConfig.filters.userId || ''}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      filters: { ...prev.filters, userId: e.target.value || undefined }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Employees</option>
                    {/* In a real app, you'd populate this from users API */}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview & Generate */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Preview</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">
                  {reportTypes.find(t => t.id === reportConfig.type)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Period:</span>
                <span className="font-medium">
                  {format(new Date(reportConfig.dateRange.start), 'MMM dd')} - {format(new Date(reportConfig.dateRange.end), 'MMM dd, yyyy')}
                </span>
              </div>
              {reportConfig.filters.priority && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Priority:</span>
                  <span className="font-medium capitalize">{reportConfig.filters.priority}</span>
                </div>
              )}
              {reportConfig.filters.status && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium capitalize">{reportConfig.filters.status.replace('_', ' ')}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Generate PDF</span>
                </>
              )}
            </button>
          </div>

          {/* Recent Reports */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Reports</h2>
            
            <div className="space-y-3">
              {[
                { name: 'Weekly Summary - Dec 2024', date: '2024-12-15', size: '2.3 MB' },
                { name: 'Task Performance - Nov 2024', date: '2024-11-30', size: '1.8 MB' },
                { name: 'Attendance Report - Nov 2024', date: '2024-11-28', size: '1.2 MB' },
              ].map((report, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.name}</p>
                    <p className="text-xs text-gray-600">{report.date} • {report.size}</p>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};