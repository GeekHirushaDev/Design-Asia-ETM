import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface TimeStatistics {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  totalTime: number;
  billableTime: number;
  nonBillableTime: number;
  billablePercentage: number;
  avgSessionTime: number;
  avgDailyHours: number;
  workingDays: number;
  totalSessions: number;
  uniqueTasks: number;
  dailyStats: Array<{
    date: string;
    totalWorkTime: number;
    totalBreakTime: number;
    billableTime: number;
    efficiency: number;
    tasksWorked: number;
  }>;
}

interface DailySummary {
  date: string;
  totalWorkTime: number;
  totalBreakTime: number;
  billableTime: number;
  nonBillableTime: number;
  efficiency: number;
  tasksWorked: number;
  timeLogs: Array<{
    id: string;
    taskId: any;
    startTime: string;
    endTime?: string;
    duration: number;
    description?: string;
    isBreak: boolean;
    breakType?: string;
    billable: boolean;
    efficiency: number;
    tags: string[];
  }>;
}


export const TimeAnalytics: React.FC = () => {
  const [statistics, setStatistics] = useState<TimeStatistics | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchStatistics();
  }, [selectedPeriod]);

  useEffect(() => {
    fetchDailySummary();
  }, [selectedDate]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/time-tracking/statistics?days=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setStatistics(result);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySummary = async () => {
    try {
      const response = await fetch(`/api/time-tracking/summary/daily/${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setDailySummary(result);
      }
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    }
  };

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

  if (loading && !statistics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!statistics) return null;

  // Prepare chart data
  const dailyChartData = statistics.dailyStats.map(day => ({
    date: format(new Date(day.date), 'MMM dd'),
    workTime: day.totalWorkTime,
    breakTime: day.totalBreakTime,
    billableTime: day.billableTime,
    efficiency: day.efficiency,
    tasks: day.tasksWorked
  }));

  const timeBreakdownData = [
    { name: 'Billable', value: statistics.billableTime, color: '#10B981' },
    { name: 'Non-Billable', value: statistics.nonBillableTime, color: '#F59E0B' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Time Analytics</h1>
            <p className="text-gray-600">
              {format(new Date(statistics.period.startDate), 'MMM dd')} - {format(new Date(statistics.period.endDate), 'MMM dd, yyyy')}
            </p>
          </div>
          <div className="flex space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'Total Time',
          formatHours(statistics.totalTime),
          ClockIcon,
          'bg-blue-500'
        )}
        {renderMetricCard(
          'Billable Time',
          formatHours(statistics.billableTime),
          CurrencyDollarIcon,
          'bg-green-500'
        )}
        {renderMetricCard(
          'Billable Rate',
          formatPercentage(statistics.billablePercentage),
          ArrowTrendingUpIcon,
          'bg-yellow-500'
        )}
        {renderMetricCard(
          'Avg Daily Hours',
          formatHours(statistics.avgDailyHours),
          CalendarIcon,
          'bg-purple-500'
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Time Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value, name) => [formatHours(value as number), name]} />
                <Bar dataKey="workTime" fill="#3B82F6" name="Work Time" />
                <Bar dataKey="breakTime" fill="#F59E0B" name="Break Time" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Billable vs Non-Billable</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={timeBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatHours(Number(value) || 0)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {timeBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatHours(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Efficiency Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Efficiency']} />
                <Line type="monotone" dataKey="efficiency" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tasks Worked Daily</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tasks" fill="#8B5CF6" name="Tasks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Session Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Sessions</span>
              <span className="font-semibold">{statistics.totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Session Length</span>
              <span className="font-semibold">{formatHours(statistics.avgSessionTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Working Days</span>
              <span className="font-semibold">{statistics.workingDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unique Tasks</span>
              <span className="font-semibold">{statistics.uniqueTasks}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Detail View</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {dailySummary && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Work Time</span>
                <span className="font-semibold">{formatHours(dailySummary.totalWorkTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Break Time</span>
                <span className="font-semibold">{formatHours(dailySummary.totalBreakTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Billable Time</span>
                <span className="font-semibold">{formatHours(dailySummary.billableTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Efficiency</span>
                <span className={`font-semibold ${dailySummary.efficiency >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(dailySummary.efficiency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tasks Worked</span>
                <span className="font-semibold">{dailySummary.tasksWorked}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Productivity Insights</h3>
          <div className="space-y-3">
            <div className={`p-3 rounded-md ${statistics.billablePercentage >= 80 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p className={`text-sm font-medium ${statistics.billablePercentage >= 80 ? 'text-green-800' : 'text-yellow-800'}`}>
                Billable Rate: {formatPercentage(statistics.billablePercentage)}
              </p>
              <p className={`text-xs ${statistics.billablePercentage >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                {statistics.billablePercentage >= 80 ? 'Excellent billing rate!' : 'Consider increasing billable work.'}
              </p>
            </div>
            
            <div className={`p-3 rounded-md ${statistics.avgDailyHours >= 6 ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
              <p className={`text-sm font-medium ${statistics.avgDailyHours >= 6 ? 'text-green-800' : 'text-blue-800'}`}>
                Daily Average: {formatHours(statistics.avgDailyHours)}
              </p>
              <p className={`text-xs ${statistics.avgDailyHours >= 6 ? 'text-green-600' : 'text-blue-600'}`}>
                {statistics.avgDailyHours >= 6 ? 'Good productivity level!' : 'Room for more productive hours.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Logs Detail */}
      {dailySummary && dailySummary.timeLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Time Logs for {format(new Date(selectedDate), 'MMMM dd, yyyy')}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailySummary.timeLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.isBreak ? `Break (${log.breakType})` : log.taskId?.title || 'Unknown Task'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(log.startTime), 'HH:mm')}
                      {log.endTime && ` - ${format(new Date(log.endTime), 'HH:mm')}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatHours(log.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.isBreak ? 'bg-orange-100 text-orange-800' :
                        log.billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {log.isBreak ? 'Break' : log.billable ? 'Billable' : 'Non-Billable'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!log.isBreak && log.efficiency > 0 && (
                        <span className={log.efficiency >= 100 ? 'text-green-600' : 'text-red-600'}>
                          {formatPercentage(log.efficiency)}
                        </span>
                      )}
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