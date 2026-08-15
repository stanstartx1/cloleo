// Advanced Geolocation Service
import { API_URL } from '../config/api';

class AdvancedGeolocationService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.positionsHistory = [];
    this.isTracking = false;
    this.accuracyLevel = 'high'; // high, balanced, battery
    this.offlinePositions = [];
    this.syncInterval = null;
  }

  // Start tracking with specified accuracy level
  startTracking(accuracyLevel = 'high', callback) {
    if (!('geolocation' in navigator)) {
      console.error('Geolocation not supported');
      return false;
    }

    if (this.isTracking) {
      this.stopTracking();
    }

    this.accuracyLevel = accuracyLevel;
    this.isTracking = true;

    const options = this.getGeolocationOptions(accuracyLevel);

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        };

        // Add to history (keep last 100 positions)
        this.positionsHistory.push({ ...this.currentPosition });
        if (this.positionsHistory.length > 100) {
          this.positionsHistory.shift();
        }

        // Store offline if needed
        if (!navigator.onLine) {
          this.offlinePositions.push({ ...this.currentPosition });
        }

        if (callback) {
          callback(this.currentPosition);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        this.handleGeolocationError(error);
      },
      options
    );

    // Start sync interval for offline positions
    this.startSync();

    return true;
  }

  // Get geolocation options based on accuracy level
  getGeolocationOptions(accuracyLevel) {
    const options = {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 30000
    };

    switch (accuracyLevel) {
      case 'high':
        options.enableHighAccuracy = true;
        options.timeout = 5000;
        options.maximumAge = 0;
        break;
      case 'balanced':
        options.enableHighAccuracy = true;
        options.timeout = 10000;
        options.maximumAge = 5000;
        break;
      case 'battery':
        options.enableHighAccuracy = false;
        options.timeout = 30000;
        options.maximumAge = 60000;
        break;
    }

    return options;
  }

  // Stop tracking
  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.isTracking = false;
    this.stopSync();
  }

  // Get current position once
  getCurrentPosition(accuracyLevel = 'high') {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options = this.getGeolocationOptions(accuracyLevel);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          this.currentPosition = currentPosition;
          resolve(currentPosition);
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Calculate ETA based on distance and average speed
  calculateETA(destinationLat, destinationLon, averageSpeed = 15) {
    if (!this.currentPosition) {
      return null;
    }

    const distance = this.calculateDistance(
      this.currentPosition.latitude,
      this.currentPosition.longitude,
      destinationLat,
      destinationLon
    );

    // Average speed in km/h, convert to m/min
    const speedMPerMin = (averageSpeed * 1000) / 60;
    const etaMinutes = distance / speedMPerMin;

    return {
      distance: Math.round(distance),
      etaMinutes: Math.round(etaMinutes),
      etaSeconds: Math.round(etaMinutes * 60)
    };
  }

  // Check if user is within a geofence
  isInGeofence(centerLat, centerLon, radiusMeters) {
    if (!this.currentPosition) {
      return false;
    }

    const distance = this.calculateDistance(
      centerLat,
      centerLon,
      this.currentPosition.latitude,
      this.currentPosition.longitude
    );

    return distance <= radiusMeters;
  }

  // Handle geolocation errors
  handleGeolocationError(error) {
    const errorMessages = {
      1: 'Permission denied',
      2: 'Position unavailable',
      3: 'Request timeout',
      4: 'Unknown error'
    };

    console.error(`Geolocation error: ${errorMessages[error.code] || error.message}`);
  }

  // Start sync for offline positions
  startSync() {
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && this.offlinePositions.length > 0) {
        this.syncOfflinePositions();
      }
    }, 30000); // Sync every 30 seconds when online
  }

  // Stop sync
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sync offline positions to server
  async syncOfflinePositions() {
    try {
      const response = await fetch(`${API_URL}/delivery/driver/sync-positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          positions: this.offlinePositions
        })
      });

      if (response.ok) {
        this.offlinePositions = [];
      }
    } catch (error) {
      console.error('Error syncing positions:', error);
    }
  }

  // Get position history
  getPositionHistory(limit = 10) {
    return this.positionsHistory.slice(-limit);
  }

  // Calculate route from history
  calculateRoute() {
    if (this.positionsHistory.length < 2) {
      return null;
    }

    return this.positionsHistory.map(pos => ({
      latitude: pos.latitude,
      longitude: pos.longitude,
      timestamp: pos.timestamp
    }));
  }

  // Change accuracy level dynamically
  changeAccuracyLevel(newLevel) {
    if (this.accuracyLevel === newLevel) {
      return;
    }

    this.accuracyLevel = newLevel;
    
    if (this.isTracking) {
      // Restart tracking with new accuracy
      this.stopTracking();
      this.startTracking(newLevel);
    }
  }

  // Get tracking status
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      accuracyLevel: this.accuracyLevel,
      currentPosition: this.currentPosition,
      offlinePositionsCount: this.offlinePositions.length,
      isOnline: navigator.onLine
    };
  }
}

// Export singleton instance
export const geolocationService = new AdvancedGeolocationService();

// Export hook for React components
import { useState, useEffect } from 'react';

export const useGeolocation = (accuracyLevel = 'high', callback) => {
  const [position, setPosition] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState(null);

  useEffect(() => {
    geolocationService.startTracking(accuracyLevel, (pos) => {
      setPosition(pos);
      if (callback) callback(pos);
    });

    setTrackingStatus(geolocationService.getTrackingStatus());

    return () => {
      geolocationService.stopTracking();
    };
  }, [accuracyLevel, callback]);

  const getCurrentPosition = () => {
    return geolocationService.getCurrentPosition(accuracyLevel);
  };

  const calculateETA = (destLat, destLon, speed) => {
    return geolocationService.calculateETA(destLat, destLon, speed);
  };

  const isInGeofence = (centerLat, centerLon, radius) => {
    return geolocationService.isInGeofence(centerLat, centerLon, radius);
  };

  return {
    position,
    trackingStatus,
    getCurrentPosition,
    calculateETA,
    isInGeofence,
    service: geolocationService
  };
};

export default geolocationService;