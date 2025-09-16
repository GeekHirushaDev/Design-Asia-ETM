import React from 'react';
import { TrendingUp, Clock, Calendar, Users } from 'lucide-react';

interface AttendanceStatsProps {
  totalRecords: number;
  presentDays: number;
  workingDays: number;
  totalHours: number;
  averageHours: number;
  attendanceRate: number;
  currentStreak?: number;
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({
  totalRecords,
  presentDays,
  workingDays,
  totalHours,
  averageHours,
  attendanceRate,
  currentStreak = 0,
}) => {
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 95) return 'bg-green-500';
    if (rate >= 85) return 'bg-blue-500';
    if (rate >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Attendance Rate"
        value={`${attendanceRate.toFixed(1)}%`}
        icon={TrendingUp}
        color={getAttendanceRateColor(attendanceRate)}
        subtitle={`${presentDays} of ${workingDays} days`}
      />
      
      <StatCard
        title="Total Hours"
        value={`${totalHours.toFixed(1)}h`}
        icon={Clock}
        color="bg-purple-500"
        subtitle={`Avg: ${averageHours.toFixed(1)}h/day`}
      />
      
      <StatCard
        title="Present Days"
        value={presentDays}
        icon={Calendar}
        color="bg-green-500"
        subtitle={`Out of ${workingDays} working days`}
      />
      
      <StatCard
        title="Current Streak"
        value={currentStreak}
        icon={Users}
        color="bg-blue-500"
        subtitle="Consecutive present days"
      />
    </div>
  );
};