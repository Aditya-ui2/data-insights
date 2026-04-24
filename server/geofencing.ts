/**
 * Geofencing Utility - Haversine formula for distance calculation
 * Used for validating if a runner is within geofenced radius of a client site
 */

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface GeofenceValidationResult {
  isValid: boolean; // true if within radius
  distance: number; // distance in meters
  errorMessage?: string;
}

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 * @param coord1 First coordinate [lat, lon]
 * @param coord2 Second coordinate [lat, lon]
 * @returns Distance in meters
 */
export function calculateDistance(coord1: LocationCoords, coord2: LocationCoords): number {
  const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters

  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance); // return in meters
}

/**
 * Validate if runner's current location is within geofence radius of a site
 * @param runnerLocation Current runner location
 * @param siteLocation Target site location
 * @param geofenceRadiusMeters Allowed radius in meters (default 100m)
 * @param maxGpsAccuracy Maximum allowed GPS accuracy in meters (fraud detection)
 * @returns Validation result with distance
 */
export function validateGeofence(
  runnerLocation: LocationCoords,
  siteLocation: LocationCoords,
  geofenceRadiusMeters: number = 100,
  maxGpsAccuracy: number = 50
): GeofenceValidationResult {
  // Validate coordinates
  if (
    !runnerLocation.latitude ||
    !runnerLocation.longitude ||
    !siteLocation.latitude ||
    !siteLocation.longitude
  ) {
    return {
      isValid: false,
      distance: 0,
      errorMessage: "Invalid coordinates provided",
    };
  }

  // Check if coordinates are within valid ranges
  if (
    Math.abs(runnerLocation.latitude) > 90 ||
    Math.abs(runnerLocation.longitude) > 180 ||
    Math.abs(siteLocation.latitude) > 90 ||
    Math.abs(siteLocation.longitude) > 180
  ) {
    return {
      isValid: false,
      distance: 0,
      errorMessage: "Coordinates out of valid range",
    };
  }

  // Calculate distance
  const distance = calculateDistance(runnerLocation, siteLocation);

  // Check if within geofence
  if (distance > geofenceRadiusMeters) {
    return {
      isValid: false,
      distance,
      errorMessage: `You are ${distance}m away from the site. Required: within ${geofenceRadiusMeters}m`,
    };
  }

  return {
    isValid: true,
    distance,
  };
}

/**
 * Anti-spoofing check - validate GPS accuracy
 * If GPS accuracy is too weak (>threshold), it indicates weak signal or spoofing
 * @param gpsAccuracy GPS accuracy in meters (from navigator.geolocation)
 * @param maxThreshold Maximum acceptable accuracy in meters (default 50m)
 * @returns true if accuracy is acceptable
 */
export function validateGpsAccuracy(gpsAccuracy: number, maxThreshold: number = 50): boolean {
  return gpsAccuracy <= maxThreshold;
}

/**
 * Calculate total travel distance between multiple sites
 * Useful for calculating daily travel expense
 * @param locations Array of locations in visit order
 * @returns Total distance in kilometers
 */
export function calculateTravelDistance(locations: LocationCoords[]): number {
  if (locations.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    totalDistance += calculateDistance(locations[i], locations[i + 1]);
  }

  // Convert meters to kilometers with 2 decimal precision
  return Math.round((totalDistance / 1000) * 100) / 100;
}

/**
 * Calculate daily travel expense based on sites visited
 * @param locations Array of site locations in visit order
 * @param ratePerKm Rate per kilometer in smallest currency unit (e.g., paise for INR)
 * @returns Total travel expense in smallest currency unit
 */
export function calculateTravelExpense(
  locations: LocationCoords[],
  ratePerKm: number
): number {
  const distanceKm = calculateTravelDistance(locations);
  return Math.round(distanceKm * ratePerKm);
}

/**
 * Format distance for display
 * @param distanceMeters Distance in meters
 * @returns Formatted string (e.g., "250m" or "1.5km")
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

/**
 * Parse coordinates from string format (for database storage/retrieval)
 * @param lat Latitude as string
 * @param lon Longitude as string
 * @returns LocationCoords object or null if invalid
 */
export function parseCoordinates(lat: string | number, lon: string | number): LocationCoords | null {
  const latitude = typeof lat === "string" ? parseFloat(lat) : lat;
  const longitude = typeof lon === "string" ? parseFloat(lon) : lon;

  if (isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  return { latitude, longitude };
}
