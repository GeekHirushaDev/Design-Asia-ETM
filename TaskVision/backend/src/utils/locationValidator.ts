import { Point } from '../services/geofenceService';

export interface LocationValidationResult {
  isValid: boolean;
  distance: number;
  accuracy: number;
  confidence: 'high' | 'medium' | 'low';
  timestamp: Date;
  method: 'gps' | 'network' | 'passive';
}

export interface LocationValidationRules {
  maxDistance: number; // meters
  minAccuracy: number; // meters
  timeWindow: number; // minutes
  allowFallback: boolean;
  strictMode: boolean;
}

export class LocationValidator {
  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(point1: Point, point2: Point): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Validate location accuracy based on GPS metadata
   */
  static validateAccuracy(accuracy: number, minRequired: number = 50): {
    isValid: boolean;
    confidence: 'high' | 'medium' | 'low';
    message: string;
  } {
    if (accuracy <= 10) {
      return {
        isValid: true,
        confidence: 'high',
        message: 'High accuracy GPS location'
      };
    } else if (accuracy <= 30) {
      return {
        isValid: true,
        confidence: 'medium',
        message: 'Good accuracy GPS location'
      };
    } else if (accuracy <= minRequired) {
      return {
        isValid: true,
        confidence: 'low',
        message: 'Acceptable accuracy location'
      };
    } else {
      return {
        isValid: false,
        confidence: 'low',
        message: `Location accuracy too low (${accuracy}m > ${minRequired}m required)`
      };
    }
  }

  /**
   * Validate if location is within acceptable range of target
   */
  static validateLocationProximity(
    userLocation: Point,
    targetLocation: Point,
    rules: LocationValidationRules
  ): LocationValidationResult {
    const distance = this.calculateDistance(userLocation, targetLocation);
    const isWithinRange = distance <= rules.maxDistance;
    
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    
    if (distance <= rules.maxDistance * 0.5) {
      confidence = 'high';
    } else if (distance <= rules.maxDistance * 0.8) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      isValid: isWithinRange || (!rules.strictMode && rules.allowFallback),
      distance: Math.round(distance),
      accuracy: 0, // Will be set externally
      confidence,
      timestamp: new Date(),
      method: 'gps'
    };
  }

  /**
   * Validate location freshness (timestamp)
   */
  static validateLocationFreshness(
    locationTimestamp: Date,
    maxAgeMinutes: number = 5
  ): { isValid: boolean; ageMinutes: number; message: string } {
    const now = new Date();
    const ageMs = now.getTime() - locationTimestamp.getTime();
    const ageMinutes = Math.floor(ageMs / (1000 * 60));

    return {
      isValid: ageMinutes <= maxAgeMinutes,
      ageMinutes,
      message: ageMinutes <= maxAgeMinutes 
        ? 'Location is fresh' 
        : `Location is ${ageMinutes} minutes old (max ${maxAgeMinutes} allowed)`
    };
  }

  /**
   * Comprehensive location validation
   */
  static validateLocation(
    userLocation: Point & { accuracy: number; timestamp: Date },
    targetLocation: Point,
    rules: LocationValidationRules
  ): {
    isValid: boolean;
    result: LocationValidationResult;
    checks: {
      proximity: { isValid: boolean; distance: number; message: string };
      accuracy: { isValid: boolean; confidence: string; message: string };
      freshness: { isValid: boolean; ageMinutes: number; message: string };
    };
    overallConfidence: 'high' | 'medium' | 'low';
  } {
    // Check proximity
    const proximityResult = this.validateLocationProximity(userLocation, targetLocation, rules);
    
    // Check accuracy
    const accuracyResult = this.validateAccuracy(userLocation.accuracy, rules.minAccuracy);
    
    // Check freshness
    const freshnessResult = this.validateLocationFreshness(userLocation.timestamp, rules.timeWindow);

    // Calculate overall validity
    const allChecksPass = proximityResult.isValid && accuracyResult.isValid && freshnessResult.isValid;
    const fallbackValid = !rules.strictMode && rules.allowFallback && proximityResult.distance <= rules.maxDistance * 1.5;
    
    const isValid = allChecksPass || fallbackValid;

    // Calculate overall confidence
    let overallConfidence: 'high' | 'medium' | 'low' = 'low';
    if (allChecksPass && proximityResult.confidence === 'high' && accuracyResult.confidence === 'high') {
      overallConfidence = 'high';
    } else if (isValid && (proximityResult.confidence === 'medium' || accuracyResult.confidence === 'medium')) {
      overallConfidence = 'medium';
    }

    return {
      isValid,
      result: {
        ...proximityResult,
        accuracy: userLocation.accuracy,
        confidence: overallConfidence
      },
      checks: {
        proximity: {
          isValid: proximityResult.isValid,
          distance: proximityResult.distance,
          message: proximityResult.isValid 
            ? `Within ${rules.maxDistance}m range (${proximityResult.distance}m away)`
            : `Outside ${rules.maxDistance}m range (${proximityResult.distance}m away)`
        },
        accuracy: accuracyResult,
        freshness: freshnessResult
      },
      overallConfidence
    };
  }

  /**
   * Detect potentially spoofed locations
   */
  static detectLocationSpoofing(
    locations: Array<Point & { timestamp: Date; accuracy: number }>
  ): {
    isSuspicious: boolean;
    reasons: string[];
    confidence: number; // 0-1, higher means more suspicious
  } {
    const reasons: string[] = [];
    let suspicionScore = 0;

    if (locations.length < 2) {
      return { isSuspicious: false, reasons: [], confidence: 0 };
    }

    // Check for impossible speeds
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      
      const distance = this.calculateDistance(prev, curr);
      const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000; // seconds
      
      if (timeDiff > 0) {
        const speed = (distance / timeDiff) * 3.6; // km/h
        
        if (speed > 300) { // Impossible for ground transport
          reasons.push(`Impossible speed detected: ${Math.round(speed)}km/h`);
          suspicionScore += 0.8;
        } else if (speed > 150) { // Very high speed
          reasons.push(`Very high speed detected: ${Math.round(speed)}km/h`);
          suspicionScore += 0.4;
        }
      }
    }

    // Check for suspiciously perfect accuracy
    const perfectAccuracyCount = locations.filter(loc => loc.accuracy === 0 || loc.accuracy < 1).length;
    if (perfectAccuracyCount > locations.length * 0.5) {
      reasons.push('Suspiciously perfect location accuracy');
      suspicionScore += 0.3;
    }

    // Check for identical coordinates
    const uniqueLocations = new Set(locations.map(loc => `${loc.lat},${loc.lng}`));
    if (uniqueLocations.size === 1 && locations.length > 3) {
      reasons.push('All locations are identical');
      suspicionScore += 0.6;
    }

    // Check for regular intervals (common in spoofing)
    if (locations.length >= 5) {
      const intervals = [];
      for (let i = 1; i < locations.length; i++) {
        intervals.push(locations[i].timestamp.getTime() - locations[i - 1].timestamp.getTime());
      }
      
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      
      if (variance < avgInterval * 0.1) { // Very regular intervals
        reasons.push('Suspiciously regular location update intervals');
        suspicionScore += 0.3;
      }
    }

    return {
      isSuspicious: suspicionScore > 0.5,
      reasons,
      confidence: Math.min(suspicionScore, 1)
    };
  }

  /**
   * Calculate location confidence based on multiple factors
   */
  static calculateLocationConfidence(
    location: Point & { accuracy: number; timestamp: Date },
    previousLocations: Array<Point & { timestamp: Date }> = []
  ): {
    confidence: number; // 0-1
    factors: {
      accuracy: number;
      freshness: number;
      consistency: number;
    };
  } {
    // Accuracy factor (0-1, higher accuracy = higher confidence)
    const accuracyFactor = Math.max(0, Math.min(1, (50 - location.accuracy) / 50));
    
    // Freshness factor (0-1, fresher = higher confidence)
    const ageMs = Date.now() - location.timestamp.getTime();
    const ageMinutes = ageMs / (1000 * 60);
    const freshnessFactor = Math.max(0, Math.min(1, (10 - ageMinutes) / 10));
    
    // Consistency factor (based on previous locations)
    let consistencyFactor = 0.5; // default neutral
    if (previousLocations.length > 0) {
      const recentLocation = previousLocations[previousLocations.length - 1];
      const distance = this.calculateDistance(location, recentLocation);
      const timeDiff = (location.timestamp.getTime() - recentLocation.timestamp.getTime()) / 1000 / 60; // minutes
      
      if (timeDiff > 0) {
        const expectedMaxDistance = timeDiff * 1000; // Assume max 60km/h average speed
        consistencyFactor = distance <= expectedMaxDistance ? 1 : Math.max(0, 1 - (distance - expectedMaxDistance) / expectedMaxDistance);
      }
    }

    const overallConfidence = (accuracyFactor * 0.4 + freshnessFactor * 0.3 + consistencyFactor * 0.3);

    return {
      confidence: overallConfidence,
      factors: {
        accuracy: accuracyFactor,
        freshness: freshnessFactor,
        consistency: consistencyFactor
      }
    };
  }

  /**
   * Generate location validation report
   */
  static generateValidationReport(
    userLocation: Point & { accuracy: number; timestamp: Date },
    targetLocation: Point,
    rules: LocationValidationRules,
    previousLocations: Array<Point & { timestamp: Date; accuracy: number }> = []
  ): {
    isValid: boolean;
    summary: string;
    details: any;
    recommendations: string[];
  } {
    const validation = this.validateLocation(userLocation, targetLocation, rules);
    const spoofingCheck = this.detectLocationSpoofing([...previousLocations, userLocation]);
    const confidence = this.calculateLocationConfidence(userLocation, previousLocations);

    const recommendations: string[] = [];
    
    if (!validation.checks.accuracy.isValid) {
      recommendations.push('Request user to enable high-accuracy GPS');
    }
    
    if (!validation.checks.freshness.isValid) {
      recommendations.push('Request fresh location reading');
    }
    
    if (spoofingCheck.isSuspicious) {
      recommendations.push('Review location history for potential spoofing');
    }
    
    if (confidence.confidence < 0.6) {
      recommendations.push('Consider requiring additional verification');
    }

    return {
      isValid: validation.isValid && !spoofingCheck.isSuspicious && confidence.confidence > 0.3,
      summary: validation.isValid 
        ? 'Location validation passed'
        : `Location validation failed: ${validation.checks.proximity.message}`,
      details: {
        validation,
        spoofingCheck,
        confidence,
        userLocation,
        targetLocation,
        rules
      },
      recommendations
    };
  }
}

export default LocationValidator;
