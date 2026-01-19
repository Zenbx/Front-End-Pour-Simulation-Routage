/**
 * Types for Logistics Simulation System
 */

// ============================================================================
// API Response Types (from backend)
// ============================================================================

export interface GeoPointResponse {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string;
}

export interface ParcelResponse {
  id: string;
  trackingCode: string;
  currentState: string;
  pickupLocation: string;
  deliveryLocation: string;
  senderName?: string;
  recipientName?: string;
  weightKg?: number;
  petriNetId?: string;
}

export interface RouteResponse {
  id: string;
  routeGeometry: string; // WKT LINESTRING
  totalDistanceKm: number;
  estimatedDurationMin: number;
  routingService?: string; // Algorithm used (BASIC, OSRM, DIJKSTRA, A_STAR)
  trafficFactor?: number;
  isActive?: boolean;
}

export interface DriverResponse {
  id: string;
  name: string;
  status: string;
  currentLocation?: GeoPointResponse;
}

// ============================================================================
// Simulation Types
// ============================================================================

export type ParcelState =
  | 'PLANNED'      // Créé, pas encore en transit
  | 'TRANSIT'      // En cours de livraison
  | 'INCIDENT'     // Incident détecté, recalcul en cours
  | 'DELIVERED'    // Livré avec succès
  | 'FAILED';      // Échec de livraison

export type IncidentType =
  | 'ROAD_CLOSURE'      // Route barrée
  | 'TRAFFIC'           // Trafic intense
  | 'VEHICLE_BREAKDOWN' // Panne véhicule
  | 'WEATHER';          // Conditions météo

export interface Position {
  lat: number;
  lng: number;
}

export interface SimulatedParcel {
  // Infos de base
  id: string;
  trackingCode: string;
  parcelData: ParcelResponse;

  // Route et navigation
  route: RouteResponse | null;
  routePath: Position[]; // Points du trajet (parsed from WKT)
  currentPosition: Position;

  // État et progression
  state: ParcelState;
  progress: number; // 0-100%
  pathIndex: number; // Index dans routePath

  // Timing
  startTime: Date | null;
  estimatedArrival: Date | null;
  actualArrival: Date | null;

  // Vitesse (km/h)
  speed: number;

  // Incidents affectant ce colis
  affectedByIncidents: string[];
}

export interface Incident {
  id: string;
  type: IncidentType;
  // Ligne d'incident (route bloquée entre deux points)
  startPosition: Position;
  endPosition: Position;
  width: number; // Largeur de la zone d'impact en mètres (de chaque côté de la ligne)
  affectedRouteIds: string[];
  timestamp: Date;
  resolved: boolean;
  description: string;
}

export interface SimulationState {
  // Entités
  parcels: Map<string, SimulatedParcel>;
  incidents: Map<string, Incident>;
  hubs: GeoPointResponse[];

  // Contrôles
  isPlaying: boolean;
  speed: number; // 1x, 2x, 5x, 10x

  // Mode UI
  incidentPlacementMode: boolean;
  selectedIncidentType: IncidentType | null;
  selectedParcelId: string | null;
}

// ============================================================================
// Form Types
// ============================================================================

export interface ParcelCreationFormData {
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  pickupHubId: string;
  deliveryHubId: string;
  weightKg: number;
  declaredValueXaf?: number;
  notes?: string;
}

// ============================================================================
// Petri Net Types (Préparation)
// ============================================================================

export interface PetriPlace {
  id: string;
  name: string;
  tokens: PetriToken[];
}

export interface PetriToken {
  value: any;
  creationTimestamp: number;
}

export interface PetriNetState {
  currentTime: number;
  marking: Record<string, PetriToken[]>;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SimulationStats {
  totalParcels: number;
  inTransit: number;
  delivered: number;
  withIncidents: number;
  totalDistance: number;
  averageSpeed: number;
}