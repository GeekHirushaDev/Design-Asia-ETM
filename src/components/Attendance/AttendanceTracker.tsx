import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { attendanceApi } from '../../lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import toast from 'react-hot-toast';

interface AttendanceRecord {
  _id: string;
  userId: string;
  date: string;
  clockIn?: {
    time: string;
    location: {
      lat: number;
      lng: number;
    };
  };
  clockOut?: {
    time: string;
    location: {
      lat: number;
      lng: number;
    };
  };
  notes?: string;
  anomalies: string[];
}

export const AttendanceTracker: React.FC = () => {
  const { user } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadAttendanceData();
    getCurrentLocation();
  }, [currentMonth]);

  const loadAttendanceData = async () => {
    try {
      setIsLoading(true);
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);
      
      const response = await attendanceApi.getAttendance({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      setAttendanceRecords(response.data.attendance);
      
      // Find today's record
      const today = response.data.attendance.find((record: AttendanceRecord) =>
        isSameDay(new Date(record.date), new Date())
      );
      setTodayRecord(today || null);
    } catch (error) {
      console.error('Failed to load attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Failed to get location:', error);
          toast.error('Location access required for attendance');
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleClockIn = async () => {
    if (!location) {
      toast.error('Location access required for attendance');
      return;
    }

    try {
      const response = await attendanceApi.clockIn(location);
      setTodayRecord(response.data.attendance);
      toast.success('Clocked in successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    if (!location) {
      toast.error('Location access required for attendance');
      return;
    }

    try {
      const response = await attendanceApi.clockOut(location);
      setTodayRecord(response.data.attendance);
      toast.success('Clocked out successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to clock out');
    }
  };

  const getAttendanceStatus = (record: AttendanceRecord | null, date: Date) => {
    if (!record) {
      if (isToday(date)) {
        return { status: 'pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      }
      return { status: 'absent', color: 'bg-red-100 text-red-800', icon: XCircle };
    }

    if (record.clockIn && record.clockOut) {
      return { status: 'present', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }

    if (record.clockIn && !record.clockOut) {
      return { status: 'incomplete', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle };
    }

    return { status: 'partial', color: 'bg-orange-100 text-orange-800', icon: AlertCircle };
  };

  const calculateWorkingHours = (record: AttendanceRecord) => {
    if (!record.clockIn || !record.clockOut) return 0;
    
    const clockIn = new Date(record.clockIn.time);
    const clockOut = new Date(record.clockOut.time);
    const diffMs = clockOut.getTime() - clockIn.getTime();
    return Math.round(diffMs / (1000 * 60 * 60) * 100) / 100; // Hours with 2 decimal places
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const totalWorkingDays = monthDays.filter(day => {
    const dayOfWeek = day.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude weekends
  }).length;

  const presentDays = attendanceRecords.filter(record => 
    record.clockIn && record.clockOut
  ).length;

  const attendanceRate = totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Tracker</h1>
        <p className="text-gray-600">Track your daily attendance and working hours</p>
      </div>

      {/* Today's Attendance */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Attendance</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Clock In</p>
              <p className="text-lg font-semibold text-gray-900">
                {todayRecord?.clockIn?.time 
                  ? format(new Date(todayRecord.clockIn.time), 'HH:mm:ss')
                  : 'Not clocked in'
                }
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Clock Out</p>
              <p className="text-lg font-semibold text-gray-900">
                {todayRecord?.clockOut?.time 
                  ? format(new Date(todayRecord.clockOut.time), 'HH:mm:ss')
                  : 'Not clocked out'
                }
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Working Hours</p>
              <p className="text-lg font-semibold text-gray-900">
                {todayRecord ? `${calculateWorkingHours(todayRecord)}h` : '0h'}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Location Status</p>
              <div className={`inline-flex items-center space-x-1 ${location ? 'text-green-600' : 'text-red-600'}`}>
                <MapPin size={16} />
                <span className="text-sm font-medium">{location ? 'Available' : 'Unavailable'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            {!todayRecord?.clockIn ? (
              <button
                onClick={handleClockIn}
                disabled={!location}
                className="bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Clock size={16} className="inline mr-2" />
                Clock In
              </button>
            ) : !todayRecord?.clockOut ? (
              <button
                onClick={handleClockOut}
                disabled={!location}
                className="bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Clock size={16} className="inline mr-2" />
                Clock Out
              </button>
            ) : (
              <div className="text-center text-green-600 font-medium py-3">
                <CheckCircle size={16} className="inline mr-2" />
                Attendance Complete
              </div>
            )}
            
            {!location && (
              <button
                onClick={getCurrentLocation}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Enable Location Access
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthDays.map(day => {
                const record = attendanceRecords.find(r => isSameDay(new Date(r.date), day));
                const { status, color, icon: Icon } = getAttendanceStatus(record, day);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={day.toISOString()}
                    className={`p-3 rounded-lg border text-center ${
                      isWeekend 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    } ${isToday(day) ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {format(day, 'd')}
                    </div>
                    {!isWeekend && (
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${color}`}>
                        <Icon size={12} className="mr-1" />
                        {status}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Stats</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-gray-900">{attendanceRate.toFixed(1)}%</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Present Days</p>
                <p className="text-2xl font-bold text-green-600">{presentDays}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Working Days</p>
                <p className="text-2xl font-bold text-gray-900">{totalWorkingDays}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-blue-600">
                  {attendanceRecords.reduce((total, record) => total + calculateWorkingHours(record), 0).toFixed(1)}h
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Legend</h3>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 rounded border"></div>
                <span className="text-sm text-gray-600">Present</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 rounded border"></div>
                <span className="text-sm text-gray-600">Incomplete</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 rounded border"></div>
                <span className="text-sm text-gray-600">Absent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-50 rounded border"></div>
                <span className="text-sm text-gray-600">Weekend</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};