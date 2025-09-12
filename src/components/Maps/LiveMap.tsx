import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import { trackingApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { socketManager } from '../../lib/socket';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationData {
  userId: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  batteryLevel?: number;
  speed?: number;
}

export const LiveMap: React.FC = () => {
  const { user } = useAuthStore();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentLocations();
    
    // Subscribe to real-time location updates
    const socket = socketManager.getSocket();
    if (socket) {
      socket.on('location-update', handleLocationUpdate);
    }

    // Get user's current location if employee
    if (user?.role === 'employee') {
      getCurrentLocation();
      startLocationTracking();
    }

    return () => {
      if (socket) {
        socket.off('location-update', handleLocationUpdate);
      }
    };
  }, [user]);

  const loadCurrentLocations = async () => {
    try {
      if (user?.role === 'admin') {
        const response = await trackingApi.getCurrentLocations();
        setLocations(response.data.locations);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationUpdate = (data: LocationData) => {
    setLocations(prev => {
      const filtered = prev.filter(loc => loc.userId !== data.userId);
      return [...filtered, data];
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
        },
        (error) => {
          console.error('Failed to get location:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const startLocationTracking = () => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          setUserLocation(location);
          
          // Send location update to server
          try {
            const batteryLevel = await getBatteryLevel();
            await trackingApi.sendPing({
              location,
              batteryLevel,
              speed: position.coords.speed || undefined,
            });
            
            // Emit to socket for real-time updates
            socketManager.emitLocationUpdate({
              location,
              batteryLevel,
            });
          } catch (error) {
            console.error('Failed to send location ping:', error);
          }
        },
        (error) => {
          console.error('Location tracking error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  };

  const getBatteryLevel = async (): Promise<number | undefined> => {
    try {
      // @ts-ignore - Battery API is not in TypeScript definitions
      if ('getBattery' in navigator) {
        // @ts-ignore
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch (error) {
      console.error('Battery API not available:', error);
    }
    return undefined;
  };

  const defaultCenter = { lat: 6.9271, lng: 79.8612 }; // Colombo, Sri Lanka
  const mapCenter = userLocation || (locations.length > 0 ? locations[0].location : defaultCenter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {user?.role === 'admin' ? 'Live Employee Tracking' : 'My Location'}
        </h2>
        {user?.role === 'employee' && userLocation && (
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Location Active</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ height: '500px' }}>
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Admin view - show all employee locations */}
          {user?.role === 'admin' && locations.map((location) => (
            <Marker
              key={location.userId}
              position={[location.location.lat, location.location.lng]}
            >
              <Popup>
                <div className="p-2">
                  <h4 className="font-semibold">{location.user.name}</h4>
                  <p className="text-sm text-gray-600">{location.user.email}</p>
                  <p className="text-xs text-gray-500">
                    Last seen: {new Date(location.timestamp).toLocaleTimeString()}
                  </p>
                  {location.batteryLevel && (
                    <p className="text-xs text-gray-500">
                      Battery: {location.batteryLevel}%
                    </p>
                  )}
                  {location.speed && (
                    <p className="text-xs text-gray-500">
                      Speed: {Math.round(location.speed)} km/h
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Employee view - show own location */}
          {user?.role === 'employee' && userLocation && (
            <>
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>
                  <div className="p-2">
                    <h4 className="font-semibold">Your Location</h4>
                    <p className="text-sm text-gray-600">
                      {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                    </p>
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={100}
                pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
              />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};