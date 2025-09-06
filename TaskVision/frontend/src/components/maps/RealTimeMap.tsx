import React, { useEffect, useRef, useState } from 'react';
import './RealTimeMap.css';

export interface MapUser {
  id: string;
  name: string;
  email: string;
  location: {
    lat: number;
    lng: number;
  };
  batteryLevel?: number;
  lastUpdate: Date;
  isOnline: boolean;
  status: 'active' | 'idle' | 'offline';
  geofences?: Array<{
    id: string;
    name: string;
  }>;
}

export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: { lat: number; lng: number };
  radius?: number;
  coordinates?: Array<{ lat: number; lng: number }>;
  color?: string;
  isActive: boolean;
}

interface RealTimeMapProps {
  users: MapUser[];
  geofences: Geofence[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  onUserClick?: (user: MapUser) => void;
  onGeofenceClick?: (geofence: Geofence) => void;
  showUserTrails?: boolean;
  showBatteryLevels?: boolean;
  showGeofenceLabels?: boolean;
  clustering?: boolean;
  className?: string;
}

const RealTimeMap: React.FC<RealTimeMapProps> = ({
  users = [],
  geofences = [],
  center = { lat: 40.7128, lng: -74.0060 },
  zoom = 10,
  height = '500px',
  onUserClick,
  onGeofenceClick,
  showBatteryLevels = true,
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [leafletAvailable, setLeafletAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Try to load Leaflet dynamically
  useEffect(() => {
    const checkLeaflet = async () => {
      try {
        // Add Leaflet CSS
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Load Leaflet script
        if (!(window as any).L) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => {
            setLeafletAvailable(true);
            setTimeout(() => setIsLoading(false), 500);
          };
          script.onerror = () => {
            setLeafletAvailable(false);
            setIsLoading(false);
          };
          document.head.appendChild(script);
        } else {
          setLeafletAvailable(true);
          setIsLoading(false);
        }
      } catch (err) {
        setLeafletAvailable(false);
        setIsLoading(false);
      }
    };

    checkLeaflet();
  }, []);

  // Initialize map when Leaflet is available
  useEffect(() => {
    if (!leafletAvailable || !mapRef.current || mapReady) return;

    const L = (window as any).L;
    if (!L) return;

    try {
      const map = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom: zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Store map instance for updates
      (mapRef.current as any).mapInstance = map;
      setMapReady(true);

      return () => {
        map.remove();
      };
    } catch (err) {
      setError('Failed to initialize map');
    }
  }, [leafletAvailable, center.lat, center.lng, zoom, mapReady]);

  // Update markers when users change
  useEffect(() => {
    if (!mapReady || !leafletAvailable || !mapRef.current) return;

    const L = (window as any).L;
    const map = (mapRef.current as any).mapInstance;
    if (!L || !map) return;

    // Clear existing markers
    if ((map as any).userMarkers) {
      (map as any).userMarkers.forEach((marker: any) => map.removeLayer(marker));
    }
    (map as any).userMarkers = [];

    // Add user markers
    users.forEach(user => {
      if (!user.location.lat || !user.location.lng) return;

      const statusColor = getUserStatusColor(user);
      const batteryDisplay = showBatteryLevels && user.batteryLevel !== undefined 
        ? `<div class="battery-level" style="background-color: ${getBatteryColor(user.batteryLevel)}">${user.batteryLevel}%</div>`
        : '';

      const customIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="user-marker-content" style="background-color: ${statusColor}">
            <div class="user-initial">${user.name.charAt(0).toUpperCase()}</div>
            ${batteryDisplay}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      const marker = L.marker([user.location.lat, user.location.lng], {
        icon: customIcon,
      });

      const popupContent = `
        <div class="user-popup">
          <h3>${user.name}</h3>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Status:</strong> <span class="status-${user.status}">${user.status.toUpperCase()}</span></p>
          ${user.batteryLevel !== undefined ? `<p><strong>Battery:</strong> ${user.batteryLevel}%</p>` : ''}
          <p><strong>Last Update:</strong> ${new Date(user.lastUpdate).toLocaleString()}</p>
          ${user.geofences && user.geofences.length > 0 ? 
            `<div class="geofence-info">In: ${user.geofences.map(gf => gf.name).join(', ')}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      
      if (onUserClick) {
        marker.on('click', () => onUserClick(user));
      }

      marker.addTo(map);
      (map as any).userMarkers.push(marker);
    });
  }, [users, mapReady, leafletAvailable, showBatteryLevels, onUserClick]);

  // Update geofences
  useEffect(() => {
    if (!mapReady || !leafletAvailable || !mapRef.current) return;

    const L = (window as any).L;
    const map = (mapRef.current as any).mapInstance;
    if (!L || !map) return;

    // Clear existing geofences
    if ((map as any).geofenceLayers) {
      (map as any).geofenceLayers.forEach((layer: any) => map.removeLayer(layer));
    }
    (map as any).geofenceLayers = [];

    // Add geofences
    geofences.forEach(geofence => {
      let layer: any;

      if (geofence.type === 'circle' && geofence.center && geofence.radius) {
        layer = L.circle([geofence.center.lat, geofence.center.lng], {
          radius: geofence.radius,
          color: geofence.color || '#3b82f6',
          fillColor: geofence.color || '#3b82f6',
          fillOpacity: 0.2,
          weight: 2,
        });
      } else if (geofence.type === 'polygon' && geofence.coordinates) {
        const latLngs = geofence.coordinates.map(coord => [coord.lat, coord.lng]);
        layer = L.polygon(latLngs, {
          color: geofence.color || '#3b82f6',
          fillColor: geofence.color || '#3b82f6',
          fillOpacity: 0.2,
          weight: 2,
        });
      }

      if (layer) {
        const popupContent = `
          <div class="geofence-popup">
            <h3>${geofence.name}</h3>
            <p><strong>Type:</strong> ${geofence.type}</p>
            <p><strong>Status:</strong> ${geofence.isActive ? 'Active' : 'Inactive'}</p>
            ${geofence.radius ? `<p><strong>Radius:</strong> ${geofence.radius}m</p>` : ''}
          </div>
        `;

        layer.bindPopup(popupContent);
        
        if (onGeofenceClick) {
          layer.on('click', () => onGeofenceClick(geofence));
        }

        layer.addTo(map);
        (map as any).geofenceLayers.push(layer);
      }
    });
  }, [geofences, mapReady, leafletAvailable, onGeofenceClick]);

  // Helper functions
  const getUserStatusColor = (user: MapUser): string => {
    if (!user.isOnline) return '#9ca3af';
    switch (user.status) {
      case 'active': return '#10b981';
      case 'idle': return '#f59e0b';
      case 'offline': return '#9ca3af';
      default: return '#6b7280';
    }
  };

  const getBatteryColor = (batteryLevel: number): string => {
    if (batteryLevel > 50) return '#10b981';
    if (batteryLevel > 20) return '#f59e0b';
    return '#ef4444';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`map-container ${className}`} style={{ height }}>
        <div className="map-loading">
          <div className="loading-spinner">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>Loading map...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`map-error ${className}`} style={{ height }}>
        <div className="error-content">
          <p>Error loading map: {error}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }

  // Fallback when Leaflet is not available
  if (!leafletAvailable) {
    return (
      <div className={`map-fallback ${className}`} style={{ height }}>
        <div className="fallback-content">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Real-Time Employee Tracking</h3>
            <div className="text-sm text-gray-600">
              {users.length} user{users.length !== 1 ? 's' : ''} online
            </div>
          </div>
          
          <div className="user-list">
            {users.map(user => (
              <div 
                key={user.id} 
                className="user-item"
                onClick={() => onUserClick?.(user)}
              >
                <div className="user-info">
                  <div 
                    className="status-indicator" 
                    style={{ backgroundColor: getUserStatusColor(user) }}
                  ></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="user-details">
                      <span className={`status-${user.status}`}>{user.status.toUpperCase()}</span>
                      {user.batteryLevel !== undefined && (
                        <span> • Battery: {user.batteryLevel}%</span>
                      )}
                      <span> • Last update: {new Date(user.lastUpdate).toLocaleTimeString()}</span>
                    </div>
                    {user.geofences && user.geofences.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1">
                        In: {user.geofences.map(gf => gf.name).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {users.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No users currently being tracked
              </div>
            )}
          </div>
          
          {geofences.length > 0 && (
            <div className="geofence-list">
              <h4>Active Geofences ({geofences.filter(gf => gf.isActive).length})</h4>
              {geofences.filter(gf => gf.isActive).map(geofence => (
                <div 
                  key={geofence.id} 
                  className="geofence-item"
                  onClick={() => onGeofenceClick?.(geofence)}
                >
                  <strong>{geofence.name}</strong> ({geofence.type})
                  {geofence.radius && <span> - {geofence.radius}m radius</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Map view
  return (
    <div className={`map-container ${className}`} style={{ height }}>
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Legend */}
      <div className="map-legend">
        <div className="legend-title">User Status</div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#10b981' }}></div>
          <span>Active</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
          <span>Idle</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#9ca3af' }}></div>
          <span>Offline</span>
        </div>
      </div>
    </div>
  );
};

export default RealTimeMap;
