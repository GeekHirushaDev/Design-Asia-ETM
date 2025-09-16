import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isFuture, isPast, addMonths, subMonths, startOfWeek, endOfWeek, getDay } from 'date-fns';

interface AttendanceRecord {
  _id: string;
  userId: string;
  date: string;
  clockIn?: {
    time: string;
    location: { lat: number; lng: number };
  };
  clockOut?: {
    time: string;
    location: { lat: number; lng: number };
  };
  totalHours: number;
  status: 'present' | 'absent' | 'partial' | 'pending';
  anomalies: string[];
}

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  records,
  currentMonth,
  onMonthChange,
  onDateSelect,
  selectedDate,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const getAttendanceForDate = (date: Date): AttendanceRecord | null => {
    return records.find(record => isSameDay(new Date(record.date), date)) || null;
  };

  const getStatusDisplay = (record: AttendanceRecord | null, date: Date) => {
    // Future dates
    if (isFuture(date) && !isToday(date)) {
      return { 
        color: 'bg-gray-50 text-gray-400 border-gray-200', 
        icon: null, 
        text: '', 
        hours: null 
      };
    }


    if (!record) {
      if (isToday(date)) {
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
          icon: Clock, 
          text: 'Pending',
          hours: null
        };
      }
      if (isPast(date)) {
        return { 
          color: 'bg-red-100 text-red-800 border-red-300', 
          icon: XCircle, 
          text: 'Absent',
          hours: null
        };
      }
      return { 
        color: 'bg-gray-50 text-gray-400 border-gray-200', 
        icon: null, 
        text: '',
        hours: null
      };
    }

    // Has record
    switch (record.status) {
      case 'present':
        return { 
          color: 'bg-green-100 text-green-800 border-green-300', 
          icon: CheckCircle, 
          text: 'Present',
          hours: record.totalHours
        };
      case 'partial':
        return { 
          color: 'bg-orange-100 text-orange-800 border-orange-300', 
          icon: AlertCircle, 
          text: 'Incomplete',
          hours: record.totalHours
        };
      case 'pending':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-300', 
          icon: Clock, 
          text: 'Active',
          hours: null
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-300', 
          icon: AlertCircle, 
          text: 'Unknown',
          hours: null
        };
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-600 border-b border-gray-200">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map(day => {
          const record = getAttendanceForDate(day);
          const { color, icon: Icon, text, hours } = getStatusDisplay(record, day);
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isTodayDate = isToday(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateSelect?.(day)}
              className={`
                relative p-2 min-h-[60px] sm:min-h-[80px] border rounded-lg transition-all cursor-pointer
                ${isCurrentMonth ? 'border-gray-200' : 'border-gray-100 opacity-50'}
                ${isTodayDate ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                ${isSelected ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}
                ${color}
                hover:shadow-sm
              `}
            >
              {/* Date Number */}
              <div className={`text-sm font-medium mb-1 ${
                isTodayDate ? 'text-blue-600' : 
                isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {format(day, 'd')}
              </div>
              
              {/* Status Icon and Text */}
              {Icon && text && isCurrentMonth && (
                <div className="flex flex-col items-center space-y-1">
                  <Icon size={14} className="sm:w-4 sm:h-4" />
                  <span className="text-xs font-medium hidden sm:block">{text}</span>
                </div>
              )}
              
              {/* Working Hours */}
              {hours !== null && hours > 0 && isCurrentMonth && (
                <div className="absolute bottom-1 left-1 right-1">
                  <div className="text-xs text-center bg-white bg-opacity-90 rounded px-1 py-0.5">
                    {hours.toFixed(1)}h
                  </div>
                </div>
              )}
              
              {/* Today Indicator */}
              {isTodayDate && (
                <div className="absolute top-1 right-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              )}

              {/* Anomalies Indicator */}
              {record?.anomalies && record.anomalies.length > 0 && (
                <div className="absolute top-1 left-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" title={`Anomalies: ${record.anomalies.join(', ')}`}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ 
      start: weekStart, 
      end: endOfWeek(weekStart, { weekStartsOn: 1 }) 
    });

    return (
      <div className="space-y-4">
        {weekDays.map(day => {
          const record = getAttendanceForDate(day);
          const { color, icon: Icon, text, hours } = getStatusDisplay(record, day);
          const isTodayDate = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateSelect?.(day)}
              className={`
                p-4 border rounded-lg transition-all cursor-pointer hover:shadow-sm
                ${isTodayDate ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                ${color}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-semibold">
                    {format(day, 'EEE, MMM dd')}
                  </div>
                  {Icon && (
                    <div className="flex items-center space-x-2">
                      <Icon size={16} />
                      <span className="text-sm font-medium">{text}</span>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  {record?.clockIn && (
                    <div className="text-sm">
                      <div>In: {format(new Date(record.clockIn.time), 'HH:mm')}</div>
                      {record.clockOut && (
                        <div>Out: {format(new Date(record.clockOut.time), 'HH:mm')}</div>
                      )}
                    </div>
                  )}
                  {hours !== null && hours > 0 && (
                    <div className="text-sm font-semibold mt-1">
                      {hours.toFixed(1)}h
                    </div>
                  )}
                </div>
              </div>
              
              {record?.anomalies && record.anomalies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {record.anomalies.map((anomaly, index) => (
                    <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      {anomaly.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'week' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onMonthChange(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => onMonthChange(new Date())}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => onMonthChange(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-4">
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>
    </div>
  );
};