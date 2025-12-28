/**
 * Enhanced Map Component
 * Main map with parcels, routes, incidents, and interactions
 */

'use client';

import React, { useEffect, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
  Circle,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SimulatedParcel, Incident, GeoPointResponse, Position, IncidentType } from '@/lib/type';
import ParcelMarker from './ParcelMarker';
import { AlertTriangle } from 'lucide-react';

// Fix Leaflet icons
const fixLeafletIcons = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

// Hub icon
const hubIcon = L.divIcon({
  className: 'custom-hub-marker',
  html: `
    <div style="
      background-color: #FF9800;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Incident icon
const incidentIcon = (type: IncidentType) => {
  let color = '#F44336'; // red
  if (type === 'TRAFFIC') color = '#FF9800'; // orange
  
  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse-incident 2s infinite;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <style>
        @keyframes pulse-incident {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      </style>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

interface EnhancedMapProps {
  center?: [number, number];
  zoom?: number;
  parcels: Map<string, SimulatedParcel>;
  incidents: Map<string, Incident>;
  hubs: GeoPointResponse[];
  selectedParcelId: string | null;
  incidentPlacementMode: boolean;
  selectedIncidentType: IncidentType | null;
  onParcelClick: (parcelId: string) => void;
  onIncidentPlace: (position: Position, type: IncidentType) => void;
  onIncidentClick: (incidentId: string) => void;
}

// Map click handler component
function MapClickHandler({
  incidentPlacementMode,
  selectedIncidentType,
  onIncidentPlace,
}: {
  incidentPlacementMode: boolean;
  selectedIncidentType: IncidentType | null;
  onIncidentPlace: (position: Position, type: IncidentType) => void;
}) {
  const map = useMap();

  useMapEvents({
    click: (e) => {
      if (incidentPlacementMode && selectedIncidentType) {
        const position: Position = {
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        };
        onIncidentPlace(position, selectedIncidentType);
      }
    },
  });

  // Change cursor when in placement mode
  useEffect(() => {
    if (incidentPlacementMode) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
  }, [incidentPlacementMode, map]);

  return null;
}

// Map view updater
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function EnhancedMap({
  center = [3.848, 11.502],
  zoom = 13,
  parcels,
  incidents,
  hubs,
  selectedParcelId,
  incidentPlacementMode,
  selectedIncidentType,
  onParcelClick,
  onIncidentPlace,
  onIncidentClick,
}: EnhancedMapProps) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const getRouteColor = (parcel: SimulatedParcel) => {
    switch (parcel.state) {
      case 'PLANNED': return '#9E9E9E'; // grey
      case 'TRANSIT': return '#FF9800'; // orange
      case 'INCIDENT': return '#F44336'; // red
      case 'DELIVERED': return '#4CAF50'; // green
      default: return '#FF9800';
    }
  };

  const getIncidentLabel = (type: IncidentType) => {
    switch (type) {
      case 'ROAD_CLOSURE': return 'Route barrée';
      case 'TRAFFIC': return 'Trafic intense';
      case 'VEHICLE_BREAKDOWN': return 'Panne véhicule';
      case 'WEATHER': return 'Conditions météo';
      default: return type;
    }
  };

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-outline elevation-1">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={center} zoom={zoom} />
        
        <MapClickHandler
          incidentPlacementMode={incidentPlacementMode}
          selectedIncidentType={selectedIncidentType}
          onIncidentPlace={onIncidentPlace}
        />

        {/* Hubs */}
        {hubs.map((hub) => (
          <Marker
            key={hub.id}
            position={[hub.latitude, hub.longitude]}
            icon={hubIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{hub.address}</p>
                <p className="text-xs text-gray-500">{hub.type}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Routes (Polylines) */}
        {Array.from(parcels.values()).map((parcel) => {
          if (parcel.routePath.length === 0) return null;

          const positions: [number, number][] = parcel.routePath.map(pos => [
            pos.lat,
            pos.lng,
          ]);

          const isSelected = parcel.id === selectedParcelId;

          return (
            <Polyline
              key={parcel.id}
              positions={positions}
              color={getRouteColor(parcel)}
              weight={isSelected ? 6 : 4}
              opacity={isSelected ? 1 : 0.7}
              dashArray={parcel.state === 'INCIDENT' ? '10, 10' : undefined}
            />
          );
        })}

        {/* Parcels */}
        {Array.from(parcels.values()).map((parcel) => (
          <ParcelMarker
            key={parcel.id}
            parcel={parcel}
            onClick={() => onParcelClick(parcel.id)}
          />
        ))}

        {/* Incidents */}
        {Array.from(incidents.values()).map((incident) => {
          if (incident.resolved) return null;

          return (
            <React.Fragment key={incident.id}>
              {/* Incident radius circle */}
              <Circle
                center={[incident.position.lat, incident.position.lng]}
                radius={incident.radius}
                pathOptions={{
                  color: '#F44336',
                  fillColor: '#F44336',
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: '5, 5',
                }}
              />

              {/* Incident marker */}
              <Marker
                position={[incident.position.lat, incident.position.lng]}
                icon={incidentIcon(incident.type)}
                eventHandlers={{
                  click: () => onIncidentClick(incident.id),
                }}
              >
                <Popup>
                  <div className="min-w-[180px] p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-bold text-sm">Incident</p>
                        <p className="text-xs text-gray-600">
                          {getIncidentLabel(incident.type)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {incident.description}
                    </p>
                    <div className="text-xs text-gray-400">
                      <p>Rayon: {incident.radius}m</p>
                      <p>
                        {incident.timestamp.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Placement mode overlay */}
        {incidentPlacementMode && (
          <div className="leaflet-top leaflet-center" style={{ zIndex: 1000 }}>
            <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm font-semibold">
                🎯 Cliquez sur la carte pour placer l'incident
              </p>
            </div>
          </div>
        )}
      </MapContainer>
    </div>
  );
}