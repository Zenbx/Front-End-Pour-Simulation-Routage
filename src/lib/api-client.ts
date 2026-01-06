/**
 * API Client for Logistics Backend
 * Enhanced with better error handling and response parsing
 */

import axios, { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) {
      // Log the request payload for debugging (handle both object and string)
      try {
        console.log('📤 Request payload:', typeof config.data === 'string' ? JSON.parse(config.data) : config.data);
      } catch (e) {
        console.log('📤 Request payload (raw):', config.data);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error: AxiosError) => {
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN_METHOD';
    const url = error.config?.url || 'UNKNOWN_URL';
    const status = error.response?.status;
    const statusText = error.response?.statusText || '';
    const respData = error.response?.data;
    const isEmpty = respData && typeof respData === 'object' && Object.keys(respData).length === 0;

    // For expected client errors (400/422/404) keep logs quieter and surface friendly messages
    if (status === 400 || status === 422 || status === 404) {
      console.warn(`⚠️ ${method} ${url} - ${status} ${statusText}`);
      console.info('ℹ️ Response body:', isEmpty ? '(empty)' : respData);
    } else {
      console.error(`❌ ${method} ${url} - ${status || 'Network Error'}`);
      console.error('❌ Response body:', isEmpty ? '(empty)' : respData);
    }

    // Handle common errors with friendly toasts
    if (status === 404) {
      toast.error('Ressource introuvable');
    } else if (status === 422) {
      const message = (respData as any)?.message || statusText || 'Requête non traitable';
      toast.error(message);
    } else if (status === 400) {
      const message = (respData as any)?.message || statusText || 'Requête invalide';
      toast.error(message);
    } else if (status === 500) {
      toast.error('Erreur serveur. Réessayez plus tard.');
    } else if (!error.response) {
      toast.error('Impossible de contacter le serveur');
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GeoPointRequest {
  address: string;
  latitude: number;
  longitude: number;
  type: string;
}

export interface GeoPointResponse {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string;
}

export interface ParcelRequest {
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  pickupLocation: string;
  pickupAddress?: string;
  deliveryLocation: string;
  deliveryAddress?: string;
  weightKg: number;
  declaredValueXaf?: number;
  notes?: string;
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
}

export interface RouteCalculationRequest {
  parcelId?: string;
  startHubId: string;
  endHubId: string;
  driverId: string;
  constraints?: {
    algorithm?: string;
    vehicleType?: string;
  };
}

export interface RouteResponse {
  id: string;
  routeGeometry: string; // WKT LineString
  totalDistanceKm: number;
  estimatedDurationMin: number;
}

export interface DriverResponse {
  id: string;
  name: string;
  status: string;
  currentLocation?: GeoPointResponse;
}

export interface IncidentRequest {
  type: 'ROAD_CLOSURE' | 'TRAFFIC' | 'VEHICLE_BREAKDOWN' | 'WEATHER';
  location: {
    latitude: number;
    longitude: number;
  };
  radius?: number;
  description?: string;
}

// ============================================================================
// LOGISTICS SERVICE
// ============================================================================

export const LogisticsService = {
  // ===== HUBS =====

  getAllHubs: async (): Promise<GeoPointResponse[]> => {
    try {
      const response = await apiClient.get<GeoPointResponse[]>('/hubs');
      return response.data;
    } catch (error) {
      console.error('Error fetching hubs:', error);
      throw error;
    }
  },

  getHub: async (id: string): Promise<GeoPointResponse> => {
    const response = await apiClient.get<GeoPointResponse>(`/hubs/${id}`);
    return response.data;
  },

  createHub: async (data: GeoPointRequest): Promise<GeoPointResponse> => {
    const response = await apiClient.post<GeoPointResponse>('/hubs', data);
    toast.success('Hub créé avec succès');
    return response.data;
  },

  // ===== DRIVERS =====

  getAllDrivers: async (): Promise<DriverResponse[]> => {
    try {
      const response = await apiClient.get<DriverResponse[]>('/drivers');
      return response.data;
    } catch (error) {
      console.error('Error fetching drivers:', error);
      throw error;
    }
  },

  // ===== PARCELS =====

  getAllParcels: async (): Promise<ParcelResponse[]> => {
    try {
      const response = await apiClient.get<ParcelResponse[]>('/parcels');
      return response.data;
    } catch (error) {
      console.error('Error fetching parcels:', error);
      throw error;
    }
  },

  getParcel: async (id: string): Promise<ParcelResponse> => {
    const response = await apiClient.get<ParcelResponse>(`/parcels/${id}`);
    return response.data;
  },

  createParcel: async (data: ParcelRequest): Promise<ParcelResponse> => {
    const response = await apiClient.post<ParcelResponse>('/parcels', data);
    toast.success(`Colis créé: ${response.data.trackingCode}`);
    return response.data;
  },

  // ===== ROUTES & DELIVERIES =====

  calculateRoute: async (data: RouteCalculationRequest): Promise<RouteResponse> => {
    try {
      // Validate required fields before sending to backend
      if (!data.parcelId) {
        throw new Error('parcelId is required for route calculation');
      }
      if (!data.startHubId) {
        throw new Error('startHubId is required for route calculation');
      }
      if (!data.endHubId) {
        throw new Error('endHubId is required for route calculation');
      }

      // Send as an object (axios will handle JSON serialization)
      const response = await apiClient.post<any>('/routes/calculate', data);

      // Adapt Backend DTO (path: GeoPoint[]) to Frontend Type (routeGeometry: WKT)
      if (response.data?.path && Array.isArray(response.data.path)) {
        const coordinates = response.data.path.map((p: any) => `${p.longitude} ${p.latitude}`).join(', ');
        response.data.routeGeometry = `LINESTRING(${coordinates})`;
      }

      // Validate response data
      if (!response.data?.routeGeometry) {
        console.error('Backend returned route without geometry:', response.data);
        throw new Error('Route geometry missing from server response');
      }

      // Validate that routeGeometry is a valid WKT string
      if (!response.data.routeGeometry.toUpperCase().startsWith('LINESTRING')) {
        console.error('Invalid routeGeometry format:', response.data.routeGeometry);
        throw new Error('Invalid route geometry format from server');
      }

      toast.success('Itinéraire calculé avec succès');
      return response.data;
    } catch (error) {
      // Log backend validation/error payload to help debugging (use warn for client errors)
      const axiosErr = error as AxiosError;
      const backendData = axiosErr.response?.data as any;
      const isEmpty = backendData && typeof backendData === 'object' && Object.keys(backendData).length === 0;
      const status = axiosErr.response?.status;

      if (status === 400 || status === 422) {
        console.warn('Route calculation client error:', status, axiosErr.response?.statusText);
        console.info('Response body:', isEmpty ? '(empty response body)' : backendData);
      } else {
        console.error('Route calculation failed:', isEmpty ? '(empty response body)' : backendData);
      }

      // Friendly fallback messages when backend returns empty or no message
      const message = backendData?.message
        || (status === 422 ? 'Aucun itinéraire trouvé entre les hubs sélectionnés' : undefined)
        || (status === 400 ? (axiosErr.response?.statusText || 'Requête invalide') : undefined)
        || (error instanceof Error ? error.message : 'Erreur lors du calcul de l\'itinéraire');

      toast.error(message);
      throw error;
    }
  },

  getRoute: async (id: string): Promise<RouteResponse> => {
    const response = await apiClient.get<RouteResponse>(`/routes/${id}`);
    return response.data;
  },

  recalculateRoute: async (
    routeId: string,
    incident: IncidentRequest
  ): Promise<RouteResponse> => {
    try {
      const response = await apiClient.post<RouteResponse>(
        `/routes/${routeId}/recalculate`,
        incident
      );
      toast.success('Itinéraire recalculé');
      return response.data;
    } catch (error) {
      toast.error('Erreur lors du recalcul');
      throw error;
    }
  },

  createDelivery: async (data: RouteCalculationRequest): Promise<RouteResponse> => {
    const response = await apiClient.post<RouteResponse>('/deliveries', data);
    return response.data;
  },

  getDelivery: async (id: string): Promise<RouteResponse> => {
    const response = await apiClient.get<RouteResponse>(`/deliveries/${id}`);
    return response.data;
  },

  getDeliveryTracking: async (id: string): Promise<RouteResponse> => {
    const response = await apiClient.get<RouteResponse>(`/deliveries/${id}/tracking`);
    return response.data;
  },
};

// ============================================================================
// PETRI NET SERVICE (Préparation - Currently disabled)
// ============================================================================

const PETRI_API_BASE_URL = 'http://localhost:8081/api/nets';

export const PetriNetService = {
  isEnabled: true,

  triggerTransition: async (entityId: string, transition: string) => {
    if (!PetriNetService.isEnabled) return;
    try {
      await axios.post(`${PETRI_API_BASE_URL}/${entityId}/fire/${transition}`, {});
      toast.success(`Transition ${transition} déclenchée`);
    } catch (error) {
      console.error('Error firing transition:', error);
      toast.error('Erreur lors du déclenchement de la transition');
    }
  },

  getState: async (entityId: string) => {
    if (!PetriNetService.isEnabled) return null;
    try {
      const response = await axios.get(`${PETRI_API_BASE_URL}/${entityId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Petri net state:', error);
      return null;
    }
  },

  getHistory: async (entityId: string) => {
    if (!PetriNetService.isEnabled) return null;
    // History endpoint not yet implemented in backend
    return [];
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const isApiAvailable = async (): Promise<boolean> => {
  try {
    await apiClient.get('/hubs');
    return true;
  } catch {
    return false;
  }
};

export default apiClient;