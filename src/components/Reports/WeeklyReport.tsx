import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface WeeklyReportData {
  period: {
    start: string;
    end: string;
    week: string;
    year: string;
  };
  summary: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    completionRate: number;
    totalTimeSpent: number;
    avgTimePerTask: number;
    workingDays: number;
    attendanceRate: number;
  };
  timeTracking: {
    byTask: Array<{
      taskId: string;
      title: string;
      priority: string;
      status: string;
      estimatedTime: number;
      actualTime: number;
      variance: number;
      variancePercentage: number;
      efficiency: number;
    }>;
    overall: {
      totalEstimated: number;
      totalActual: number;
      variance: number;
      variancePercentage: number;
      efficiency: number;
    };
  };
  productivity: {
    completedByDay: { [key: string]: number };
    timeSpentByDay: { [key: string]: number };
    productivityByDay: { [key: string]: number };
    priorityMetrics: {
      high: { completed: number; total: number };
      medium: { completed: number; total: number };
      low: { completed: number; total: number };
    };
    averageProductivity: number;
  };
}

interface WeeklyComparisonData {
  currentWeek: WeeklyReportData;
  previousWeek: WeeklyReportData;
  comparison: {
    tasks: {
      total: { current: number; previous: number; change: number };
      completed: { current: number; previous: number; change: number };
      completionRate: { current: number; previous: number; change: number };
    };
    time: {
      totalSpent: { current: number; previous: number; change: number };
      efficiency: { current: number; previous: number; change: number };
    };
    productivity: { current: number; previous: number; change: number };
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export const WeeklyReport: React.FC = () => {
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [comparisonData, setComparisonData] = useState<WeeklyComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'current' | 'comparison'>('current');
  const [selectedWeek, setSelectedWeek] = useState(0);

  const fetchWeeklyReport = async (weekOffset = 0) => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/weekly/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ weekOffset })
      });

      if (response.ok) {
        const result = await response.json();
        setReportData(result.data);
      }
    } catch (error) {
      console.error('Error fetching weekly report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyComparison = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/weekly/comparison', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setComparisonData(result.data);
      }
    } catch (error) {
      console.error('Error fetching weekly comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'current') {
      fetchWeeklyReport(selectedWeek);
    } else {
      fetchWeeklyComparison();
    }
  }, [view, selectedWeek]);

  const formatHours = (hours: number) => `${hours.toFixed(1)}h`;
  const formatPercentage = (percentage: number) => `${percentage.toFixed(1)}%`;

  const renderMetricCard = (title: string, value: string | number, icon: React.ElementType, color: string, trend?: number) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-md ${color}`}>
          {React.createElement(icon, { className: 'w-6 h-6 text-white' })}
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {trend !== undefined && (
              <span className={`ml-2 flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                )}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentData = view === 'comparison' ? comparisonData?.currentWeek : reportData;
  if (!currentData) return null;

  // Prepare chart data
  const productivityData = Object.entries(currentData.productivity.completedByDay).map(([day, completed]) => ({
    day: format(new Date(day), 'MMM dd'),
    completed,
    timeSpent: currentData.productivity.timeSpentByDay[day] || 0,
    productivity: currentData.productivity.productivityByDay[day] || 0
  }));

  const priorityData = Object.entries(currentData.productivity.priorityMetrics).map(([priority, metrics]) => ({
    name: priority.charAt(0).toUpperCase() + priority.slice(1),
    completed: metrics.completed,
    total: metrics.total,
    rate: metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0
  }));

  const timeTrackingData = currentData.timeTracking.byTask.slice(0, 10).map(task => ({
    name: task.title.substring(0, 20) + (task.title.length > 20 ? '...' : ''),
    estimated: task.estimatedTime,
    actual: task.actualTime,
    efficiency: task.efficiency
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Weekly Report</h1>
            <p className="text-gray-600">
              Week {currentData.period.week}, {currentData.period.year} • {' '}
              {format(new Date(currentData.period.start), 'MMM dd')} - {format(new Date(currentData.period.end), 'MMM dd')}
            </p>
          </div>
          <div className="flex space-x-4">
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setView('current')}
                className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                  view === 'current'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Current Week
              </button>
              <button
                onClick={() => setView('comparison')}
                className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  view === 'comparison'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Comparison
              </button>
            </div>
            {view === 'current' && (
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value={0}>Current Week</option>
                <option value={-1}>Previous Week</option>
                <option value={-2}>2 Weeks Ago</option>
                <option value={-3}>3 Weeks Ago</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'Total Tasks',
          currentData.summary.totalTasks,
          ChartBarIcon,
          'bg-blue-500',
          view === 'comparison' ? comparisonData?.comparison.tasks.total.change : undefined
        )}
        {renderMetricCard(
          'Completed Tasks',
          currentData.summary.completedTasks,
          DocumentTextIcon,
          'bg-green-500',
          view === 'comparison' ? comparisonData?.comparison.tasks.completed.change : undefined
        )}
        {renderMetricCard(
          'Completion Rate',
          formatPercentage(currentData.summary.completionRate),
          ArrowTrendingUpIcon,
          'bg-yellow-500',
          view === 'comparison' ? comparisonData?.comparison.tasks.completionRate.change : undefined
        )}
        {renderMetricCard(
          'Time Spent',
          formatHours(currentData.summary.totalTimeSpent),
          ClockIcon,
          'bg-purple-500',
          view === 'comparison' ? comparisonData?.comparison.time.totalSpent.change : undefined
        )}
      </div>

      {/* Time Tracking Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estimated vs Actual Time</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">Overall Efficiency</span>
              <span className={`text-lg font-semibold ${
                currentData.timeTracking.overall.efficiency >= 100 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercentage(currentData.timeTracking.overall.efficiency)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Estimated</p>
                <p className="text-xl font-semibold text-blue-600">
                  {formatHours(currentData.timeTracking.overall.totalEstimated)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Actual</p>
                <p className="text-xl font-semibold text-purple-600">
                  {formatHours(currentData.timeTracking.overall.totalActual)}
                </p>
              </div>
            </div>
            {currentData.timeTracking.overall.variance !== 0 && (
              <div className={`p-3 rounded-md ${
                currentData.timeTracking.overall.variance > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center">
                  <ExclamationTriangleIcon className={`w-5 h-5 mr-2 ${
                    currentData.timeTracking.overall.variance > 0 ? 'text-red-600' : 'text-green-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    currentData.timeTracking.overall.variance > 0 ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {currentData.timeTracking.overall.variance > 0 ? 'Over' : 'Under'} budget by{' '}
                    {formatHours(Math.abs(currentData.timeTracking.overall.variance))} ({formatPercentage(Math.abs(currentData.timeTracking.overall.variancePercentage))})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Priority Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => {
                    const total = priorityData.reduce((sum, d) => sum + d.completed, 0);
                    const percentage = total > 0 && value ? ((Number(value) / total) * 100).toFixed(1) : '0';
                    return `${name}: ${percentage}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="completed"
                >
                  {priorityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Productivity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="completed" fill="#3B82F6" name="Tasks Completed" />
                <Bar yAxisId="right" dataKey="timeSpent" fill="#10B981" name="Hours Spent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Task Time Analysis (Top 10)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeTrackingData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="estimated" fill="#F59E0B" name="Estimated (h)" />
                <Bar dataKey="actual" fill="#EF4444" name="Actual (h)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Task Details */}
      {currentData.timeTracking.byTask.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Task Time Tracking Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentData.timeTracking.byTask.slice(0, 20).map((task) => (
                  <tr key={task.taskId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatHours(task.estimatedTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatHours(task.actualTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={task.variance > 0 ? 'text-red-600' : 'text-green-600'}>
                        {task.variance > 0 ? '+' : ''}{formatHours(task.variance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={task.efficiency >= 100 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercentage(task.efficiency)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};