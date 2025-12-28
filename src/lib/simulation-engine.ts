/**
 * Simulation Engine
 * Handles parcel movement, incident detection, and route recalculation
 */

import {
  SimulatedParcel,
  Incident,
  Position,
  ParcelState,
  RouteResponse,
} from './type';
import {
  interpolateAlongPath,
  isWithinRadius,
  calculatePathDistance,
} from './wkt-parser';

export class SimulationEngine {
  private static readonly BASE_SPEED = 40; // km/h (vitesse moyenne en ville)
  private static readonly UPDATE_INTERVAL_MS = 100; // 10 FPS
  
  /**
   * Calculate new position for a parcel based on elapsed time
   */
  static updateParcelPosition(
    parcel: SimulatedParcel,
    deltaTimeMs: number,
    simulationSpeed: number
  ): SimulatedParcel {
    if (parcel.state !== 'TRANSIT' || !parcel.route || parcel.routePath.length === 0) {
      return parcel;
    }

    // Calculate distance traveled in this frame
    const actualSpeed = parcel.speed * simulationSpeed;
    const hoursElapsed = (deltaTimeMs / 1000 / 60 / 60);
    const distanceTraveledKm = actualSpeed * hoursElapsed;

    // Calculate total route distance
    const totalDistanceKm = parcel.route.totalDistanceKm;
    
    // Update progress
    const progressIncrement = distanceTraveledKm / totalDistanceKm;
    const newProgress = Math.min(parcel.progress + progressIncrement, 1);

    // Interpolate new position
    const { position, segmentIndex } = interpolateAlongPath(
      parcel.routePath,
      newProgress
    );

    // Check if delivered
    const isDelivered = newProgress >= 0.99;

    return {
      ...parcel,
      currentPosition: position,
      progress: newProgress,
      pathIndex: segmentIndex,
      state: isDelivered ? 'DELIVERED' : parcel.state,
      actualArrival: isDelivered ? new Date() : parcel.actualArrival,
    };
  }

  /**
   * Check if parcel collides with any active incident
   */
  static checkIncidentCollision(
    parcel: SimulatedParcel,
    incidents: Map<string, Incident>
  ): Incident | null {
    for (const incident of incidents.values()) {
      if (incident.resolved) continue;

      // Check if parcel is within incident radius
      const isAffected = isWithinRadius(
        parcel.currentPosition,
        incident.position,
        incident.radius / 1000 // Convert meters to km
      );

      if (isAffected && !parcel.affectedByIncidents.includes(incident.id)) {
        return incident;
      }
    }
    return null;
  }

  /**
   * Create a new simulated parcel from route response
   */
  static createSimulatedParcel(
    parcelData: any,
    route: RouteResponse,
    routePath: Position[]
  ): SimulatedParcel {
    const now = new Date();
    const estimatedArrival = new Date(
      now.getTime() + route.estimatedDurationMin * 60 * 1000
    );

    return {
      id: parcelData.id,
      trackingCode: parcelData.trackingCode,
      parcelData,
      route,
      routePath,
      currentPosition: routePath[0] || { lat: 0, lng: 0 },
      state: 'PLANNED',
      progress: 0,
      pathIndex: 0,
      startTime: null,
      estimatedArrival,
      actualArrival: null,
      speed: this.BASE_SPEED,
      affectedByIncidents: [],
    };
  }

  /**
   * Start a parcel's journey
   */
  static startParcel(parcel: SimulatedParcel): SimulatedParcel {
    return {
      ...parcel,
      state: 'TRANSIT',
      startTime: new Date(),
    };
  }

  /**
   * Update parcel with new recalculated route
   */
  static updateParcelRoute(
    parcel: SimulatedParcel,
    newRoute: RouteResponse,
    newRoutePath: Position[]
  ): SimulatedParcel {
    // Keep current progress but update to new path
    const { position } = interpolateAlongPath(newRoutePath, parcel.progress);

    return {
      ...parcel,
      route: newRoute,
      routePath: newRoutePath,
      currentPosition: position,
      state: 'TRANSIT', // Resume transit after recalculation
      estimatedArrival: new Date(
        Date.now() + newRoute.estimatedDurationMin * 60 * 1000
      ),
    };
  }

  /**
   * Mark parcel as affected by incident
   */
  static markParcelIncident(
    parcel: SimulatedParcel,
    incidentId: string
  ): SimulatedParcel {
    return {
      ...parcel,
      state: 'INCIDENT',
      affectedByIncidents: [...parcel.affectedByIncidents, incidentId],
    };
  }

  /**
   * Calculate ETA for a parcel
   */
  static calculateETA(parcel: SimulatedParcel): Date | null {
    if (!parcel.route || parcel.state !== 'TRANSIT') {
      return parcel.estimatedArrival;
    }

    const remainingProgress = 1 - parcel.progress;
    const remainingDistanceKm = parcel.route.totalDistanceKm * remainingProgress;
    const hoursRemaining = remainingDistanceKm / parcel.speed;
    const msRemaining = hoursRemaining * 60 * 60 * 1000;

    return new Date(Date.now() + msRemaining);
  }

  /**
   * Check if incident affects a specific route path
   */
  static doesIncidentAffectRoute(
    incident: Incident,
    routePath: Position[]
  ): boolean {
    return routePath.some(position =>
      isWithinRadius(position, incident.position, incident.radius / 1000)
    );
  }

  /**
   * Get simulation statistics
   */
  static getSimulationStats(parcels: Map<string, SimulatedParcel>) {
    const parcelsArray = Array.from(parcels.values());
    
    return {
      totalParcels: parcelsArray.length,
      inTransit: parcelsArray.filter(p => p.state === 'TRANSIT').length,
      delivered: parcelsArray.filter(p => p.state === 'DELIVERED').length,
      withIncidents: parcelsArray.filter(p => p.state === 'INCIDENT').length,
      totalDistance: parcelsArray.reduce((sum, p) => 
        sum + (p.route?.totalDistanceKm || 0), 0
      ),
      averageSpeed: parcelsArray.length > 0
        ? parcelsArray.reduce((sum, p) => sum + p.speed, 0) / parcelsArray.length
        : 0,
    };
  }
}