import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { attendanceApi } from '../../lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isFuture, isPast, addMonths, subMonths, startOfWeek, endOfWeek, addDays } from 'date-fns';
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

interface LocationState {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export const AttendanceTracker: React.FC = () => {
  const { user } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      
      setAttendanceRecords(response.data.attendance || []);
      
      // Find today's record
      const today = (response.data.attendance || []).find((record: AttendanceRecord) =>
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
    setLocationError('');
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        });
        setLocationError('');
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocationError(errorMessage);
        console.error('Location error:', error);
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      }
    );
  };

  const handleClockIn = async () => {
    if (!location) {
      toast.error('Location access required for attendance');
      getCurrentLocation();
      return;
    }

    if (todayRecord?.clockIn) {
      toast.error('Already clocked in today');
      return;
    }

    try {
      setIsClockingIn(true);
      const response = await attendanceApi.clockIn({
        lat: location.lat,
        lng: location.lng,
      });
      // Reload from server first to refresh lists, then ensure local state reflects the new record
      await loadAttendanceData();
      setTodayRecord(response.data.attendance);
      toast.success('Clocked in successfully');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to clock in';
      toast.error(message);
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!location) {
      toast.error('Location access required for attendance');
      getCurrentLocation();
      return;
    }

    if (!todayRecord?.clockIn) {
      toast.error('Must clock in first');
      return;
    }

    if (todayRecord?.clockOut?.time) {
      toast.error('Already clocked out today');
      return;
    }

    try {
      setIsClockingOut(true);
      const response = await attendanceApi.clockOut({
        lat: location.lat,
        lng: location.lng,
      });
      // Reload from server first to refresh lists, then ensure local state reflects the new record
      await loadAttendanceData();
      setTodayRecord(response.data.attendance);
      toast.success('Clocked out successfully');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to clock out';
      toast.error(message);
    } finally {
      setIsClockingOut(false);
    }
  };

  const getAttendanceStatus = (record: AttendanceRecord | null, date: Date) => {
    // Future dates
    if (isFuture(date) && !isToday(date)) {
      return { status: '', color: 'bg-gray-50 text-gray-400', icon: null, text: '' };
    }


    if (!record) {
      if (isToday(date)) {
        return { 
          status: 'pending', 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
          icon: Clock, 
          text: 'Pending' 
        };
      }
      if (isPast(date)) {
        return { 
          status: 'absent', 
          color: 'bg-red-100 text-red-800 border-red-300', 
          icon: XCircle, 
          text: 'Absent' 
        };
      }
      return { status: '', color: 'bg-gray-50 text-gray-400', icon: null, text: '' };
    }

    if (record.clockIn && record.clockOut) {
      return { 
        status: 'present', 
        color: 'bg-green-100 text-green-800 border-green-300', 
        icon: CheckCircle, 
        text: 'Present' 
      };
    }

    if (record.clockIn && !record.clockOut) {
      if (isToday(date)) {
        return { 
          status: 'active', 
          color: 'bg-blue-100 text-blue-800 border-blue-300', 
          icon: Clock, 
          text: 'Active' 
        };
      }
      return { 
        status: 'incomplete', 
        color: 'bg-orange-100 text-orange-800 border-orange-300', 
        icon: AlertCircle, 
        text: 'Incomplete' 
      };
    }

    return { 
      status: 'partial', 
      color: 'bg-orange-100 text-orange-800 border-orange-300', 
      icon: AlertCircle, 
      text: 'Partial' 
    };
  };

  const calculateWorkingHours = (record: AttendanceRecord) => {
    if (!record.clockIn || !record.clockOut) return 0;
    
    const clockIn = new Date(record.clockIn.time);
    const clockOut = new Date(record.clockOut.time);
    const diffMs = clockOut.getTime() - clockIn.getTime();
    return Math.round(diffMs / (1000 * 60 * 60) * 100) / 100;
  };

  const calculateCurrentWorkingHours = () => {
    if (!todayRecord?.clockIn) return 0;
    
    const clockIn = new Date(todayRecord.clockIn.time);
    const now = new Date();
    const diffMs = now.getTime() - clockIn.getTime();
    return Math.round(diffMs / (1000 * 60 * 60) * 100) / 100;
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start week on Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Calculate statistics
  const totalDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    .filter(day => !isFuture(day)).length;

  const presentDays = attendanceRecords.filter(record => 
    record.clockIn && record.clockOut
  ).length;

  const attendanceRate = totalDaysInMonth > 0 ? (presentDays / totalDaysInMonth) * 100 : 0;

  const totalHours = attendanceRecords.reduce((total, record) => 
    total + calculateWorkingHours(record), 0
  );

  const averageHours = presentDays > 0 ? totalHours / presentDays : 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Tracker</h1>
          <p className="text-gray-600">Track your daily attendance and working hours</p>
        </div>
        <div className="text-sm text-gray-500">
          Current time: {format(currentTime, 'HH:mm:ss')}
        </div>
      </div>

      {/* Today's Attendance Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Attendance</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Clock In/Out Status */}
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

          {/* Working Hours */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Working Hours</p>
              <p className="text-lg font-semibold text-gray-900">
                {todayRecord?.clockIn && todayRecord?.clockOut 
                  ? `${calculateWorkingHours(todayRecord).toFixed(1)}h`
                  : todayRecord?.clockIn 
                    ? `${calculateCurrentWorkingHours().toFixed(1)}h (ongoing)`
                    : '0h'
                }
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Location Status</p>
              <div className={`inline-flex items-center space-x-1 ${location ? 'text-green-600' : 'text-red-600'}`}>
                <MapPin size={16} />
                <span className="text-sm font-medium">
                  {location ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!todayRecord?.clockIn ? (
              <button
                onClick={handleClockIn}
                disabled={!location || isClockingIn}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isClockingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Clocking In...
                  </>
                ) : (
                  <>
                    <Clock size={16} className="mr-2" />
                    Clock In
                  </>
                )}
              </button>
            ) : !todayRecord?.clockOut?.time ? (
              <button
                onClick={handleClockOut}
                disabled={!location || isClockingOut}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isClockingOut ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Clocking Out...
                  </>
                ) : (
                  <>
                    <Clock size={16} className="mr-2" />
                    Clock Out
                  </>
                )}
              </button>
            ) : (
              <div className="w-full text-center text-green-600 font-medium py-3 border-2 border-green-200 rounded-lg bg-green-50">
                <CheckCircle size={16} className="inline mr-2" />
                Attendance Complete
              </div>
            )}
            
            {locationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">
                  {locationError || 'Location access is required for attendance tracking'}
                </p>
                <button
                  onClick={getCurrentLocation}
                  className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center"
                >
                  {locationError ? 'Retry Location Access' : 'Enable Location Access'}
                  Retry Location Access
                </button>
              </div>
            )}
          </div>

          {/* Current Status */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Status</p>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                todayRecord?.clockIn && !todayRecord?.clockOut
                  ? 'bg-blue-100 text-blue-800'
                  : todayRecord?.clockOut
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {todayRecord?.clockIn && !todayRecord?.clockOut
                  ? 'Working'
                  : todayRecord?.clockOut
                    ? 'Completed'
                    : 'Not Started'
                }
              </div>
            </div>
            
            {location && (
              <div className="text-xs text-gray-500">
                <p>Lat: {location.lat.toFixed(6)}</p>
                <p>Lng: {location.lng.toFixed(6)}</p>
                {location.accuracy && (
                  <p>Accuracy: ±{Math.round(location.accuracy)}m</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar and Statistics */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Calendar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const record = attendanceRecords.find(r => isSameDay(new Date(r.date), day));
                const { status, color, icon: Icon, text } = getAttendanceStatus(record, day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      relative p-2 min-h-[80px] border rounded-lg transition-all hover:shadow-sm
                      ${isCurrentMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}
                      ${isToday ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                      ${color.includes('bg-') ? color : 'bg-white'}
                    `}
                  >
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {format(day, 'd')}
                    </div>
                    
                    {Icon && text && isCurrentMonth && (
                      <div className="flex flex-col items-center space-y-1">
                        <Icon size={16} />
                        <span className="text-xs font-medium">{text}</span>
                      </div>
                    )}
                    
                    {record && record.clockIn && record.clockOut && isCurrentMonth && (
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="text-xs text-center text-gray-600 bg-white bg-opacity-75 rounded px-1">
                          {calculateWorkingHours(record).toFixed(1)}h
                        </div>
                      </div>
                    )}
                    
                    {isToday && (
                      <div className="absolute top-1 right-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-6">
          {/* Monthly Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Stats</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Attendance Rate</span>
                <span className="text-xl font-bold text-blue-600">{attendanceRate.toFixed(1)}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${attendanceRate}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-gray-500">Present Days</p>
                  <p className="text-lg font-semibold text-green-600">{presentDays}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Days</p>
                  <p className="text-lg font-semibold text-gray-900">{totalDaysInMonth}</p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Hours</span>
                  <span className="font-semibold text-gray-900">{totalHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-gray-600">Average/Day</span>
                  <span className="text-sm text-gray-700">Future Days</span>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800 font-medium">
                    📍 Location access is required for all attendance tracking
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Weekend work is supported - clock in/out as needed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Legend</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded flex items-center justify-center">
                  <CheckCircle size={10} className="text-green-600" />
                </div>
                <span className="text-sm text-gray-700">Present (Full Day)</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded flex items-center justify-center">
                  <Clock size={10} className="text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">Currently Active</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded flex items-center justify-center">
                  <AlertCircle size={10} className="text-orange-600" />
                </div>
                <span className="text-sm text-gray-700">Incomplete</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded flex items-center justify-center">
                  <XCircle size={10} className="text-red-600" />
                </div>
                <span className="text-sm text-gray-700">Absent</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded flex items-center justify-center">
                  <Clock size={10} className="text-yellow-600" />
                </div>
                <span className="text-sm text-gray-700">Pending (Today)</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                <span className="text-sm text-gray-700">Weekend/Future</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              <button
                onClick={getCurrentLocation}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <MapPin size={16} className="mr-2" />
                Refresh Location
              </button>
              
              <button
                onClick={loadAttendanceData}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RotateCcw size={16} className="mr-2" />
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Records Table (Mobile Responsive) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Records</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clock In
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clock Out
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceRecords
                .filter(record => !isFuture(new Date(record.date)))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((record) => {
                  const { status, color } = getAttendanceStatus(record, new Date(record.date));
                  
                  return (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {isToday(new Date(record.date)) && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          )}
                          {format(new Date(record.date), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.clockIn?.time 
                          ? format(new Date(record.clockIn.time), 'HH:mm:ss')
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.clockOut?.time 
                          ? format(new Date(record.clockOut.time), 'HH:mm:ss')
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.clockIn && record.clockOut 
                          ? `${calculateWorkingHours(record).toFixed(1)}h`
                          : record.clockIn && isToday(new Date(record.date))
                            ? `${calculateCurrentWorkingHours().toFixed(1)}h (ongoing)`
                            : '-'
                        }
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                          {status === 'present' ? 'Present' :
                           status === 'active' ? 'Active' :
                           status === 'incomplete' ? 'Incomplete' :
                           status === 'absent' ? 'Absent' :
                           status === 'pending' ? 'Pending' :
                           'Unknown'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          
          {attendanceRecords.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar size={32} className="mx-auto mb-2 opacity-50" />
              <p>No attendance records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};