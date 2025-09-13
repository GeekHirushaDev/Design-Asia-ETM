import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { taskApi } from '../../lib/api';

interface TaskProgressData {
  priority: string;
  status: string;
  count: number;
  percentage: number;
  totalTasks: number;
}

interface ProgressSummary {
  byPriority: TaskProgressData[];
  byStatus: TaskProgressData[];
  overallProgress: number;
  completionRate: number;
}

// Color schemes for different priorities and statuses
const PRIORITY_COLORS = {
  high: '#EF4444',    // red-500
  medium: '#F59E0B',  // amber-500
  low: '#10B981',     // emerald-500
};

const STATUS_COLORS = {
  not_started: '#9CA3AF',  // gray-400
  in_progress: '#3B82F6',  // blue-500
  paused: '#F59E0B',       // amber-500
  completed: '#10B981',    // emerald-500
};

export const TaskProgressDashboard: React.FC = () => {
  const [progressData, setProgressData] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'priority' | 'status'>('priority');

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      const response = await taskApi.getProgressSummary();
      setProgressData(response.data);
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#10B981'; // green
    if (percentage >= 60) return '#F59E0B'; // amber
    if (percentage >= 40) return '#3B82F6'; // blue
    return '#EF4444'; // red
  };

  const ProgressCard: React.FC<{ title: string; value: number; color: string; subtitle?: string }> = ({ 
    title, value, color, subtitle 
  }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold" style={{ color }}>{value}%</div>
          {subtitle && <div className="text-sm text-gray-600">{subtitle}</div>}
        </div>
        <div className="w-16 h-16 rounded-full relative" style={{ backgroundColor: `${color}20` }}>
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="2"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeDasharray={`${value}, 100`}
            />
          </svg>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!progressData) {
    return <div className="text-center py-8 text-gray-500">No progress data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ProgressCard
          title="Overall Progress"
          value={progressData.overallProgress}
          color={getProgressColor(progressData.overallProgress)}
          subtitle="All tasks combined"
        />
        <ProgressCard
          title="Completion Rate"
          value={progressData.completionRate}
          color={STATUS_COLORS.completed}
          subtitle="Tasks completed"
        />
        <ProgressCard
          title="In Progress"
          value={progressData.byStatus.find(s => s.status === 'in_progress')?.percentage || 0}
          color={STATUS_COLORS.in_progress}
          subtitle="Active tasks"
        />
        <ProgressCard
          title="High Priority"
          value={progressData.byPriority.find(p => p.priority === 'high')?.percentage || 0}
          color={PRIORITY_COLORS.high}
          subtitle="Critical tasks"
        />
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('priority')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'priority'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            By Priority
          </button>
          <button
            onClick={() => setViewMode('status')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'status'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            By Status
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Task Distribution {viewMode === 'priority' ? 'by Priority' : 'by Status'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={viewMode === 'priority' ? progressData.byPriority : progressData.byStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={viewMode} />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => [`${value} tasks`, 'Count']}
                labelFormatter={(label: any) => `${viewMode}: ${label}`}
              />
              <Bar 
                dataKey="count" 
                fill={viewMode === 'priority' ? '#3B82F6' : '#10B981'}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Progress Percentage {viewMode === 'priority' ? 'by Priority' : 'by Status'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={viewMode === 'priority' ? progressData.byPriority : progressData.byStatus}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="percentage"
                nameKey={viewMode}
              >
                {(viewMode === 'priority' ? progressData.byPriority : progressData.byStatus).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={viewMode === 'priority' ? PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS] : STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]} 
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value}%`, 'Percentage']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Detailed Progress {viewMode === 'priority' ? 'by Priority' : 'by Status'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {viewMode === 'priority' ? 'Priority' : 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress Bar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(viewMode === 'priority' ? progressData.byPriority : progressData.byStatus).map((item) => (
                <tr key={viewMode === 'priority' ? item.priority : item.status}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ 
                          backgroundColor: viewMode === 'priority' 
                            ? PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS]
                            : STATUS_COLORS[item.status as keyof typeof STATUS_COLORS]
                        }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {viewMode === 'priority' ? item.priority : item.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.percentage.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: viewMode === 'priority' 
                            ? PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS]
                            : STATUS_COLORS[item.status as keyof typeof STATUS_COLORS]
                        }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};