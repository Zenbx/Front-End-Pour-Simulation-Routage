/**
 * useSimulation Hook
 * Main hook for managing the logistics simulation state and logic
 */

import { useReducer, useEffect, useCallback, useRef } from 'react';
import {
  SimulationState,
  SimulatedParcel,
  Incident,
  GeoPointResponse,
  ParcelResponse,
  RouteResponse,
  Position,
  IncidentType,
} from '@/lib/type';
import { SimulationEngine } from '@/lib/simulation-engine';
import { parseWKTLineString } from '@/lib/wkt-parser';
import { LogisticsService } from '@/lib/api-client';
import { toast } from 'react-hot-toast';

// ============================================================================
// ACTIONS
// ============================================================================

type SimulationAction =
  | { type: 'SET_HUBS'; payload: GeoPointResponse[] }
  | { type: 'ADD_PARCEL'; payload: SimulatedParcel }
  | { type: 'UPDATE_PARCEL'; payload: { id: string; updates: Partial<SimulatedParcel> } }
  | { type: 'REMOVE_PARCEL'; payload: string }
  | { type: 'ADD_INCIDENT'; payload: Incident }
  | { type: 'RESOLVE_INCIDENT'; payload: string }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'TOGGLE_INCIDENT_MODE'; payload: { active: boolean; type: IncidentType | null } }
  | { type: 'SELECT_PARCEL'; payload: string | null }
  | { type: 'UPDATE_ALL_PARCELS'; payload: Map<string, SimulatedParcel> };

// ============================================================================
// REDUCER
// ============================================================================

const initialState: SimulationState = {
  parcels: new Map(),
  incidents: new Map(),
  hubs: [],
  isPlaying: false,
  speed: 1,
  incidentPlacementMode: false,
  selectedIncidentType: null,
  selectedParcelId: null,
};

function simulationReducer(
  state: SimulationState,
  action: SimulationAction
): SimulationState {
  switch (action.type) {
    case 'SET_HUBS':
      return { ...state, hubs: action.payload };

    case 'ADD_PARCEL': {
      const newParcels = new Map(state.parcels);
      newParcels.set(action.payload.id, action.payload);
      return { ...state, parcels: newParcels };
    }

    case 'UPDATE_PARCEL': {
      const newParcels = new Map(state.parcels);
      const existing = newParcels.get(action.payload.id);
      if (existing) {
        newParcels.set(action.payload.id, { ...existing, ...action.payload.updates });
      }
      return { ...state, parcels: newParcels };
    }

    case 'REMOVE_PARCEL': {
      const newParcels = new Map(state.parcels);
      newParcels.delete(action.payload);
      return { ...state, parcels: newParcels };
    }

    case 'ADD_INCIDENT': {
      const newIncidents = new Map(state.incidents);
      newIncidents.set(action.payload.id, action.payload);
      return { ...state, incidents: newIncidents };
    }

    case 'RESOLVE_INCIDENT': {
      const newIncidents = new Map(state.incidents);
      const incident = newIncidents.get(action.payload);
      if (incident) {
        newIncidents.set(action.payload, { ...incident, resolved: true });
      }
      return { ...state, incidents: newIncidents };
    }

    case 'PLAY':
      return { ...state, isPlaying: true };

    case 'PAUSE':
      return { ...state, isPlaying: false };

    case 'SET_SPEED':
      return { ...state, speed: action.payload };

    case 'TOGGLE_INCIDENT_MODE':
      return {
        ...state,
        incidentPlacementMode: action.payload.active,
        selectedIncidentType: action.payload.type,
      };

    case 'SELECT_PARCEL':
      return { ...state, selectedParcelId: action.payload };

    case 'UPDATE_ALL_PARCELS':
      return { ...state, parcels: action.payload };

    default:
      return state;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useSimulation() {
  const [state, dispatch] = useReducer(simulationReducer, initialState);
  const lastUpdateRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | undefined>(undefined);

  // ===== SIMULATION LOOP =====

  const simulationLoop = useCallback(() => {
    if (!state.isPlaying) return;

    const now = Date.now();
    const deltaTimeMs = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    // Update all parcels in transit
    const updatedParcels = new Map(state.parcels);
    let hasChanges = false;

    for (const [id, parcel] of updatedParcels.entries()) {
      if (parcel.state === 'TRANSIT') {
        // Update position
        const updated = SimulationEngine.updateParcelPosition(
          parcel,
          deltaTimeMs,
          state.speed
        );

        // Check for incident collision
        const collidingIncident = SimulationEngine.checkIncidentCollision(
          updated,
          state.incidents
        );

        if (collidingIncident) {
          // Mark as incident and trigger recalculation
          const markedParcel = SimulationEngine.markParcelIncident(
            updated,
            collidingIncident.id
          );
          updatedParcels.set(id, markedParcel);
          hasChanges = true;

          // Trigger recalculation (async)
          handleIncidentRecalculation(markedParcel, collidingIncident);
        } else if (updated !== parcel) {
          updatedParcels.set(id, updated);
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      dispatch({ type: 'UPDATE_ALL_PARCELS', payload: updatedParcels });
    }

    animationFrameRef.current = requestAnimationFrame(simulationLoop);
  }, [state.isPlaying, state.parcels, state.incidents, state.speed]);

  // Start/stop simulation loop
  useEffect(() => {
    if (state.isPlaying) {
      lastUpdateRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(simulationLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, simulationLoop]);

  // ===== ACTIONS =====

  const loadHubs = useCallback(async () => {
    try {
      const hubs = await LogisticsService.getAllHubs();
      dispatch({ type: 'SET_HUBS', payload: hubs });
    } catch (error) {
      console.error('Failed to load hubs:', error);
      toast.error('Erreur lors du chargement des hubs');
    }
  }, []);

  const addParcel = useCallback(
    async (parcelData: ParcelResponse, route: RouteResponse | null) => {
      // If there is a valid route, create a simulated parcel with path and auto-start
      if (route) {
        // Validate route geometry before parsing
        if (!route.routeGeometry) {
          console.error('Route missing geometry:', route);
          toast.error('Itinéraire invalide: géométrie manquante');
          return;
        }

        if (!route.routeGeometry.toUpperCase().includes('LINESTRING')) {
          console.error('Invalid route geometry format:', route.routeGeometry);
          toast.error('Itinéraire invalide: format de géométrie incorrect');
          return;
        }

        const routePath = parseWKTLineString(route.routeGeometry);

        if (routePath.length === 0) {
          console.error('Failed to parse route geometry:', route.routeGeometry);
          toast.error('Impossible de tracer l\'itinéraire (parsing WKT échoué)');
          return;
        }

        if (routePath.length < 2) {
          console.warn('Route has less than 2 points:', routePath);
          toast.error('Itinéraire invalide: moins de 2 points');
          return;
        }

        const simulatedParcel = SimulationEngine.createSimulatedParcel(
          parcelData,
          route,
          routePath
        );

        // Auto-start immediately
        simulatedParcel.state = 'TRANSIT';
        simulatedParcel.startTime = new Date();

        dispatch({ type: 'ADD_PARCEL', payload: simulatedParcel });

        toast.success(`Livraison démarrée: ${parcelData.trackingCode}`);
      } else {
        // No route: add parcel in PLANNED state so it appears in the UI but doesn't start
        let startPos: Position = { lat: 4.05, lng: 9.7 };

        // Try to place parcel at pickup hub coordinates if available
        const pickupHub = state.hubs.find(h => h.id === parcelData.pickupLocation);
        if (pickupHub) {
          startPos = { lat: pickupHub.latitude, lng: pickupHub.longitude };
        }

        const simulatedParcel: SimulatedParcel = {
          id: parcelData.id,
          trackingCode: parcelData.trackingCode,
          parcelData,
          route: null,
          routePath: [],
          currentPosition: startPos,
          state: 'PLANNED',
          progress: 0,
          pathIndex: 0,
          startTime: null,
          estimatedArrival: null,
          actualArrival: null,
          speed: 30,
          affectedByIncidents: [],
        };

        dispatch({ type: 'ADD_PARCEL', payload: simulatedParcel });
        console.info('Parcel added without route (will remain PLANNED):', simulatedParcel.id);
      }
    },
    [state.hubs]
  );

  const startParcel = useCallback((parcelId: string) => {
    const parcel = state.parcels.get(parcelId);
    if (!parcel) return;

    const started = SimulationEngine.startParcel(parcel);
    dispatch({
      type: 'UPDATE_PARCEL',
      payload: { id: parcelId, updates: started },
    });

    toast.success(`Livraison démarrée: ${parcel.trackingCode}`);
  }, [state.parcels]);

  const createIncident = useCallback(
    async (position: Position, type: IncidentType, description?: string) => {
      const incident: Incident = {
        id: `incident-${Date.now()}`,
        type,
        position,
        radius: type === 'ROAD_CLOSURE' ? 500 : 200, // meters
        affectedRouteIds: [],
        timestamp: new Date(),
        resolved: false,
        description: description || `Incident: ${type}`,
      };

      dispatch({ type: 'ADD_INCIDENT', payload: incident });
      toast.error(`⚠️ Incident créé: ${type}`);

      // Turn off placement mode
      dispatch({
        type: 'TOGGLE_INCIDENT_MODE',
        payload: { active: false, type: null },
      });
    },
    []
  );

  const resolveIncident = useCallback((incidentId: string) => {
    dispatch({ type: 'RESOLVE_INCIDENT', payload: incidentId });
    toast.success('Incident résolu');
  }, []);

  const handleIncidentRecalculation = async (
    parcel: SimulatedParcel,
    incident: Incident
  ) => {
    if (!parcel.route) return;

    toast.loading('Recalcul de l\'itinéraire...', { id: `recalc-${parcel.id}` });

    try {
      const newRoute = await LogisticsService.recalculateRoute(
        parcel.route.id,
        {
          type: incident.type,
          location: {
            latitude: incident.position.lat,
            longitude: incident.position.lng,
          },
          radius: incident.radius,
          description: incident.description,
        }
      );

      const newRoutePath = parseWKTLineString(newRoute.routeGeometry);

      const updated = SimulationEngine.updateParcelRoute(
        parcel,
        newRoute,
        newRoutePath
      );

      dispatch({
        type: 'UPDATE_PARCEL',
        payload: { id: parcel.id, updates: updated },
      });

      toast.success('Itinéraire recalculé', { id: `recalc-${parcel.id}` });
    } catch (error) {
      console.error('Recalculation failed:', error);
      toast.error('Échec du recalcul', { id: `recalc-${parcel.id}` });
    }
  };

  const play = useCallback(() => dispatch({ type: 'PLAY' }), []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const setSpeed = useCallback(
    (speed: number) => dispatch({ type: 'SET_SPEED', payload: speed }),
    []
  );
  const selectParcel = useCallback(
    (id: string | null) => dispatch({ type: 'SELECT_PARCEL', payload: id }),
    []
  );

  const toggleIncidentMode = useCallback((type: IncidentType | null) => {
    dispatch({
      type: 'TOGGLE_INCIDENT_MODE',
      payload: { active: type !== null, type },
    });
  }, []);

  return {
    state,
    actions: {
      loadHubs,
      addParcel,
      startParcel,
      createIncident,
      resolveIncident,
      play,
      pause,
      setSpeed,
      selectParcel,
      toggleIncidentMode,
    },
  };
}