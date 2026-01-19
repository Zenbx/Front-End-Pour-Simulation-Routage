/**
 * WKT (Well-Known Text) Parser
 * Converts WKT geometry strings to usable coordinate arrays
 */

import { Position } from './type';

/**
 * Parse WKT LINESTRING to array of positions
 * 
 * Input: "LINESTRING(11.502 3.848, 11.510 3.850, ...)"
 * Output: [{lat: 3.848, lng: 11.502}, {lat: 3.850, lng: 11.510}, ...]
 * 
 * Note: WKT format is "lng lat", but Leaflet expects [lat, lng]
 */
export function parseWKTLineString(wkt: string): Position[] {
  try {
    // Remove "LINESTRING(" prefix and ")" suffix
    const coordsString = wkt
      .replace(/^LINESTRING\s*\(/i, '')
      .replace(/\)$/, '')
      .trim();

    // Split by comma to get individual points
    const pointStrings = coordsString.split(',');

    const positions: Position[] = pointStrings.map(pointStr => {
      const [lngStr, latStr] = pointStr.trim().split(/\s+/);
      const lng = parseFloat(lngStr);
      const lat = parseFloat(latStr);

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error(`Invalid coordinates: ${pointStr}`);
      }

      return { lat, lng };
    });

    return positions;
  } catch (error) {
    console.error('Error parsing WKT:', error);
    return [];
  }
}

/**
 * Parse WKT POINT to position
 * Input: "POINT(11.502 3.848)"
 * Output: {lat: 3.848, lng: 11.502}
 */
export function parseWKTPoint(wkt: string): Position | null {
  try {
    const coordsString = wkt
      .replace(/^POINT\s*\(/i, '')
      .replace(/\)$/, '')
      .trim();

    const [lngStr, latStr] = coordsString.split(/\s+/);
    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error(`Invalid coordinates: ${coordsString}`);
    }

    return { lat, lng };
  } catch (error) {
    console.error('Error parsing WKT Point:', error);
    return null;
  }
}

/**
 * Convert positions array to WKT LINESTRING
 * Inverse operation for API requests
 */
export function positionsToWKT(positions: Position[]): string {
  const coords = positions
    .map(pos => `${pos.lng} ${pos.lat}`)
    .join(', ');
  
  return `LINESTRING(${coords})`;
}

/**
 * Calculate total distance of a path in kilometers
 */
export function calculatePathDistance(positions: Position[]): number {
  if (positions.length < 2) return 0;

  let totalDistance = 0;
  
  for (let i = 0; i < positions.length - 1; i++) {
    totalDistance += haversineDistance(
      positions[i],
      positions[i + 1]
    );
  }

  return totalDistance;
}

/**
 * Haversine formula to calculate distance between two points
 * Returns distance in kilometers
 */
export function haversineDistance(pos1: Position, pos2: Position): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(pos2.lat - pos1.lat);
  const dLng = toRad(pos2.lng - pos1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pos1.lat)) *
    Math.cos(toRad(pos2.lat)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a position is within a circular area
 */
export function isWithinRadius(
  point: Position,
  center: Position,
  radiusKm: number
): boolean {
  const distance = haversineDistance(point, center);
  return distance <= radiusKm;
}

/**
 * Check if a point is within a buffer zone around a line segment
 * Uses point-to-line-segment distance calculation
 *
 * @param point - The point to check
 * @param lineStart - Start point of the line segment
 * @param lineEnd - End point of the line segment
 * @param bufferKm - Buffer distance in kilometers
 * @returns true if the point is within the buffer zone
 */
export function isWithinLineBuffer(
  point: Position,
  lineStart: Position,
  lineEnd: Position,
  bufferKm: number
): boolean {
  // Calculate distance from point to line segment
  const distance = pointToSegmentDistance(point, lineStart, lineEnd);
  return distance <= bufferKm;
}

/**
 * Calculate the minimum distance from a point to a line segment
 * Returns distance in kilometers
 */
function pointToSegmentDistance(
  point: Position,
  lineStart: Position,
  lineEnd: Position
): number {
  // Vector from lineStart to lineEnd
  const segmentLat = lineEnd.lat - lineStart.lat;
  const segmentLng = lineEnd.lng - lineStart.lng;

  // Vector from lineStart to point
  const pointLat = point.lat - lineStart.lat;
  const pointLng = point.lng - lineStart.lng;

  // Calculate segment length squared (avoid sqrt for performance)
  const segmentLengthSq = segmentLat * segmentLat + segmentLng * segmentLng;

  // If segment is actually a point, return distance to that point
  if (segmentLengthSq === 0) {
    return haversineDistance(point, lineStart);
  }

  // Calculate projection parameter t
  // t represents where the projection of point falls on the line segment
  // t = 0: at lineStart, t = 1: at lineEnd, 0 < t < 1: between them
  const t = Math.max(0, Math.min(1,
    (pointLat * segmentLat + pointLng * segmentLng) / segmentLengthSq
  ));

  // Calculate the closest point on the segment
  const closestPoint: Position = {
    lat: lineStart.lat + t * segmentLat,
    lng: lineStart.lng + t * segmentLng
  };

  // Return distance from point to closest point on segment
  return haversineDistance(point, closestPoint);
}

/**
 * Interpolate position along a path based on progress (0-1)
 */
export function interpolateAlongPath(
  path: Position[],
  progress: number
): { position: Position; segmentIndex: number } {
  if (path.length === 0) {
    return { position: { lat: 0, lng: 0 }, segmentIndex: 0 };
  }
  
  if (path.length === 1 || progress <= 0) {
    return { position: path[0], segmentIndex: 0 };
  }
  
  if (progress >= 1) {
    return { position: path[path.length - 1], segmentIndex: path.length - 2 };
  }

  // Calculate cumulative distances
  const distances: number[] = [0];
  for (let i = 0; i < path.length - 1; i++) {
    const segmentDist = haversineDistance(path[i], path[i + 1]);
    distances.push(distances[i] + segmentDist);
  }

  const totalDistance = distances[distances.length - 1];
  const targetDistance = totalDistance * progress;

  // Find the segment
  let segmentIndex = 0;
  for (let i = 0; i < distances.length - 1; i++) {
    if (targetDistance >= distances[i] && targetDistance <= distances[i + 1]) {
      segmentIndex = i;
      break;
    }
  }

  // Interpolate within the segment
  const segmentStart = distances[segmentIndex];
  const segmentEnd = distances[segmentIndex + 1];
  const segmentLength = segmentEnd - segmentStart;
  const segmentProgress = segmentLength > 0 
    ? (targetDistance - segmentStart) / segmentLength 
    : 0;

  const pos1 = path[segmentIndex];
  const pos2 = path[segmentIndex + 1];

  const position = {
    lat: pos1.lat + (pos2.lat - pos1.lat) * segmentProgress,
    lng: pos1.lng + (pos2.lng - pos1.lng) * segmentProgress,
  };

  return { position, segmentIndex };
}