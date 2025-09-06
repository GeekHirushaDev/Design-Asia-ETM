import React, { useState, useEffect } from 'react';
import RealTimeMap, { MapUser, Geofence } from '../components/maps/RealTimeMap';

const MapDemo: React.FC = () => {
  const [users, setUsers] = useState<MapUser[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);

  useEffect(() => {
    // Sample users data
    const sampleUsers: MapUser[] = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        location: { lat: 40.7128, lng: -74.0060 },
        batteryLevel: 85,
        lastUpdate: new Date(),
        isOnline: true,
        status: 'active',
        geofences: [{ id: '1', name: 'Office Area' }]
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        location: { lat: 40.7589, lng: -73.9851 },
        batteryLevel: 45,
        lastUpdate: new Date(Date.now() - 300000), // 5 minutes ago
        isOnline: true,
        status: 'idle',
        geofences: []
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        location: { lat: 40.6892, lng: -74.0445 },
        batteryLevel: 15,
        lastUpdate: new Date(Date.now() - 900000), // 15 minutes ago
        isOnline: false,
        status: 'offline',
        geofences: []
      }
    ];

    // Sample geofences data
    const sampleGeofences: Geofence[] = [
      {
        id: '1',
        name: 'Office Area',
        type: 'circle',
        center: { lat: 40.7128, lng: -74.0060 },
        radius: 500,
        color: '#3b82f6',
        isActive: true
      },
      {
        id: '2',
        name: 'Warehouse District',
        type: 'polygon',
        coordinates: [
          { lat: 40.6892, lng: -74.0445 },
          { lat: 40.6900, lng: -74.0435 },
          { lat: 40.6880, lng: -74.0425 },
          { lat: 40.6872, lng: -74.0435 }
        ],
        color: '#10b981',
        isActive: true
      }
    ];

    setUsers(sampleUsers);
    setGeofences(sampleGeofences);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setUsers(prevUsers => 
        prevUsers.map(user => ({
          ...user,
          lastUpdate: new Date(),
          // Randomly update battery level
          batteryLevel: user.batteryLevel !== undefined 
            ? Math.max(0, user.batteryLevel - Math.random() * 2)
            : undefined,
          // Randomly adjust location slightly
          location: {
            lat: user.location.lat + (Math.random() - 0.5) * 0.001,
            lng: user.location.lng + (Math.random() - 0.5) * 0.001
          }
        }))
      );
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleUserClick = (user: MapUser) => {
    console.log('User clicked:', user);
    alert(`User: ${user.name}\nStatus: ${user.status}\nBattery: ${user.batteryLevel}%`);
  };

  const handleGeofenceClick = (geofence: Geofence) => {
    console.log('Geofence clicked:', geofence);
    alert(`Geofence: ${geofence.name}\nType: ${geofence.type}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Real-Time Employee Tracking Demo
        </h1>
        <p className="text-gray-600">
          Interactive map showing employee locations, geofences, and battery levels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Live Location Map</h2>
            <RealTimeMap
              users={users}
              geofences={geofences}
              center={{ lat: 40.7128, lng: -74.0060 }}
              zoom={12}
              height="600px"
              onUserClick={handleUserClick}
              onGeofenceClick={handleGeofenceClick}
              showBatteryLevels={true}
              className="rounded-lg"
            />
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          {/* Users Summary */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Employee Status</h3>
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: user.isOnline 
                          ? user.status === 'active' ? '#10b981' 
                          : user.status === 'idle' ? '#f59e0b' 
                          : '#9ca3af'
                          : '#9ca3af'
                      }}
                    />
                    <span className="font-medium text-sm">{user.name}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {user.batteryLevel !== undefined && `${Math.round(user.batteryLevel)}%`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Geofences Summary */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Active Geofences</h3>
            <div className="space-y-2">
              {geofences.filter(gf => gf.isActive).map(geofence => (
                <div key={geofence.id} className="p-2 bg-blue-50 rounded">
                  <div className="font-medium text-sm">{geofence.name}</div>
                  <div className="text-xs text-gray-600 capitalize">{geofence.type}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Users:</span>
                <span className="font-medium">{users.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Online:</span>
                <span className="font-medium text-green-600">
                  {users.filter(u => u.isOnline).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active:</span>
                <span className="font-medium text-blue-600">
                  {users.filter(u => u.status === 'active').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Geofences:</span>
                <span className="font-medium">{geofences.filter(gf => gf.isActive).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• Click on user markers or list items to view detailed information</li>
          <li>• Green markers indicate active users, yellow for idle, gray for offline</li>
          <li>• Battery levels are shown on markers (if available) and update in real-time</li>
          <li>• Blue areas represent geofences - virtual boundaries for automatic tracking</li>
          <li>• The map will fallback to a list view if mapping library fails to load</li>
        </ul>
      </div>
    </div>
  );
};

export default MapDemo;
