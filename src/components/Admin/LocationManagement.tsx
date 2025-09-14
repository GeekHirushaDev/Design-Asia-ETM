import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Plus, Edit, Trash2, Save, X, Search, Target } from 'lucide-react';
import { locationApi } from '../../lib/api';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Location {
  _id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  description?: string;
  createdBy: {
    name: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
}

// Western Province coordinates (centered on Colombo)
const WESTERN_PROVINCE_CENTER = {
  lat: 6.9271,
  lng: 79.8612,
  zoom: 11
};

// Map click handler component
const MapClickHandler: React.FC<{
  onLocationSelect: (lat: number, lng: number) => void;
  selectedPosition: { lat: number; lng: number } | null;
}> = ({ onLocationSelect, selectedPosition }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });

  return selectedPosition ? (
    <Marker position={[selectedPosition.lat, selectedPosition.lng]} />
  ) : null;
};

const LocationFormModal: React.FC<{
  location?: Location | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ location, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    latitude: location?.latitude || '',
    longitude: location?.longitude || '',
    radiusMeters: location?.radiusMeters?.toString() || '100',
    description: location?.description || '',
  });
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(
    location ? { lat: location.latitude, lng: location.longitude } : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<any>(null);

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedPosition({ lat, lng });
    setFormData({
      ...formData,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    });
    toast.success('Location selected from map');
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          handleLocationSelect(lat, lng);
          
          // Center map on current location
          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15);
          }
        },
        () => {
          toast.error('Failed to get current location');
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const lat = parseFloat(formData.latitude.toString());
    const lng = parseFloat(formData.longitude.toString());
    const radius = parseInt(formData.radiusMeters);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      toast.error('Please select a location on the map or enter valid coordinates');
      return;
    }

    if (lat < -90 || lat > 90) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }

    if (radius < 10 || radius > 10000) {
      toast.error('Radius must be between 10 and 10000 meters');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        name: formData.name.trim(),
        address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`, // Auto-generated address
        latitude: lat,
        longitude: lng,
        radiusMeters: radius,
        description: formData.description.trim() || undefined,
      };

      if (location) {
        await locationApi.updateLocation(location._id, payload);
        toast.success('Location updated successfully');
      } else {
        await locationApi.createLocation(payload);
        toast.success('Location created successfully');
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save location');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            {location ? 'Edit Location' : 'Create New Location'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
            {/* Map Section */}
            <div className="p-6 border-r border-gray-200">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Select Location on Map</h4>
                  <button
                    type="button"
                    onClick={handleCurrentLocation}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Target size={14} className="mr-1" />
                    Current Location
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Click anywhere on the map to set the location coordinates
                </p>
              </div>
              
              <div className="h-96 rounded-lg overflow-hidden border border-gray-300">
                <MapContainer
                  ref={mapRef}
                  center={[WESTERN_PROVINCE_CENTER.lat, WESTERN_PROVINCE_CENTER.lng]}
                  zoom={WESTERN_PROVINCE_CENTER.zoom}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler
                    onLocationSelect={handleLocationSelect}
                    selectedPosition={selectedPosition}
                  />
                </MapContainer>
              </div>
              
              {selectedPosition && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapPin size={16} className="text-green-600" />
                    <span className="text-sm text-green-800 font-medium">
                      Location Selected
                    </span>
                  </div>
                  <div className="text-xs text-green-700 mt-1">
                    Coordinates: {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
                  </div>
                </div>
              )}
            </div>

            {/* Form Section */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter location name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => {
                        setFormData({ ...formData, latitude: e.target.value });
                        const lat = parseFloat(e.target.value);
                        const lng = parseFloat(formData.longitude.toString());
                        if (!isNaN(lat) && !isNaN(lng)) {
                          setSelectedPosition({ lat, lng });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="6.9271"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => {
                        setFormData({ ...formData, longitude: e.target.value });
                        const lat = parseFloat(formData.latitude.toString());
                        const lng = parseFloat(e.target.value);
                        if (!isNaN(lat) && !isNaN(lng)) {
                          setSelectedPosition({ lat, lng });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="79.8612"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coverage Radius (meters) *
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    value={formData.radiusMeters}
                    onChange={(e) => setFormData({ ...formData, radiusMeters: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Area coverage radius (10-10000 meters)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Optional description for this location"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !selectedPosition}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" />
                        {location ? 'Update Location' : 'Create Location'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LocationManagement: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      const response = await locationApi.getLocations({ search: searchTerm });
      const data = response.data;
      setLocations(Array.isArray(data) ? data : data.locations || []);
    } catch (error) {
      toast.error('Failed to load locations');
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setShowForm(true);
  };

  const handleDelete = async (location: Location) => {
    if (!window.confirm(`Are you sure you want to delete "${location.name}"?`)) {
      return;
    }

    try {
      await locationApi.deleteLocation(location._id);
      toast.success('Location deleted successfully');
      loadLocations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete location');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingLocation(null);
    loadLocations();
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingLocation(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <MapPin className="mr-3 text-blue-600" size={24} />
            Location Management
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} className="mr-2" />
            Add Location
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search locations by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && loadLocations()}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <LocationFormModal
          location={editingLocation}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Locations List */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading locations...</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-12">
            <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No locations found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Try adjusting your search criteria' : 'Create your first location to get started'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} className="mr-2" />
                Create First Location
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => (
              <div
                key={location._id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">{location.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          location.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {location.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{location.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => handleEdit(location)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit location"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(location)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete location"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin size={14} className="mr-2 flex-shrink-0 text-blue-500" />
                    <span className="font-mono text-xs">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-3 flex-shrink-0"></div>
                    <span>{location.radiusMeters}m coverage radius</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <span>Created by {location.createdBy.name}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(location.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};