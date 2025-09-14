import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, Save, X, Search } from 'lucide-react';
import { locationApi } from '../../lib/api';
import toast from 'react-hot-toast';

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

export const LocationManagement: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [addressSearchResults, setAddressSearchResults] = useState<any[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [showAddressResults, setShowAddressResults] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radiusMeters: '100',
    description: '',
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      const response = await locationApi.getLocations({ search: searchTerm });
      setLocations(response.data.locations || []);
    } catch (error) {
      toast.error('Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    const radius = parseInt(formData.radiusMeters);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      toast.error('Please enter valid coordinates and radius');
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
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: lat,
        longitude: lng,
        radiusMeters: radius,
        description: formData.description.trim() || undefined,
      };

      if (editingLocation) {
        await locationApi.updateLocation(editingLocation._id, payload);
        toast.success('Location updated successfully');
      } else {
        await locationApi.createLocation(payload);
        toast.success('Location created successfully');
      }

      resetForm();
      loadLocations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save location');
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radiusMeters: location.radiusMeters.toString(),
      description: location.description || '',
    });
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

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      radiusMeters: '100',
      description: '',
    });
    setEditingLocation(null);
    setShowForm(false);
    setAddressSearchResults([]);
    setShowAddressResults(false);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          });
          toast.success('Current location coordinates filled');
        },
        () => {
          toast.error('Failed to get current location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
  };

  // OpenStreetMap Nominatim integration for address search
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSearchResults([]);
      setShowAddressResults(false);
      return;
    }

    try {
      setSearchingAddress(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const results = await response.json();
      setAddressSearchResults(results);
      setShowAddressResults(true);
    } catch (error) {
      toast.error('Failed to search addresses');
      setAddressSearchResults([]);
      setShowAddressResults(false);
    } finally {
      setSearchingAddress(false);
    }
  };

  const selectAddress = (result: any) => {
    setFormData({
      ...formData,
      address: result.display_name,
      latitude: parseFloat(result.lat).toFixed(6),
      longitude: parseFloat(result.lon).toFixed(6),
    });
    setShowAddressResults(false);
    setAddressSearchResults([]);
    toast.success('Address selected and coordinates filled');
  };

  // Mock OpenStreetMap integration - in real implementation, you'd integrate with a map library
  const openMapSelector = () => {
    toast('Use the address search above to find locations automatically!');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <MapPin className="mr-2" size={20} />
            Location Management
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Add Location
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && loadLocations()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingLocation ? 'Edit Location' : 'Add New Location'}
                </h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

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
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address * (Search with OpenStreetMap)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value });
                        searchAddress(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Start typing to search addresses..."
                      required
                    />
                    {searchingAddress && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    
                    {/* Address Search Results */}
                    {showAddressResults && addressSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {addressSearchResults.map((result, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectAddress(result)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="text-sm text-gray-900 truncate">{result.display_name}</div>
                            <div className="text-xs text-gray-500">
                              Lat: {parseFloat(result.lat).toFixed(6)}, Lng: {parseFloat(result.lon).toFixed(6)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Selection Options */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Set Coordinates
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={openMapSelector}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Select from Map
                    </button>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Use Current Location
                    </button>
                  </div>
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
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Radius (meters) *
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
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Save size={16} className="mr-2" />
                    {editingLocation ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Locations List */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading locations...</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <p className="text-gray-500 mt-2">No locations found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {locations.map((location) => (
              <div
                key={location._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900">{location.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          location.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                    {location.description && (
                      <p className="text-sm text-gray-500 mb-2">{location.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </span>
                      <span>📏 {location.radiusMeters}m radius</span>
                      <span>👤 {location.createdBy.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};