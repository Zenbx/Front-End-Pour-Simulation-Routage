/**
 * Parcel Marker Component
 * Animated marker for parcels on the map
 */

'use client';

import React from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { SimulatedParcel } from '@/lib/type';
import { Package, MapPin, Clock, AlertTriangle } from 'lucide-react';

interface ParcelMarkerProps {
  parcel: SimulatedParcel;
  onClick?: () => void;
}

// Create custom icon for parcel
const createParcelIcon = (state: string) => {
  let color = '#FF9800'; // orange
  if (state === 'DELIVERED') color = '#4CAF50'; // green
  if (state === 'INCIDENT') color = '#F44336'; // red
  if (state === 'PLANNED') color = '#9E9E9E'; // grey

  return L.divIcon({
    className: 'custom-parcel-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: all 0.3s ease;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M16 16h3a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"></path>
          <path d="M8 8H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3"></path>
          <rect x="8" y="8" width="8" height="8"></rect>
        </svg>
        ${state === 'TRANSIT' ? `
          <div style="
            position: absolute;
            top: -2px;
            right: -2px;
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            animation: pulse 1s infinite;
          "></div>
        ` : ''}
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

export default function ParcelMarker({ parcel, onClick }: ParcelMarkerProps) {
  const icon = createParcelIcon(parcel.state);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'PLANNED': return 'Planifié';
      case 'TRANSIT': return 'En transit';
      case 'INCIDENT': return 'Incident';
      case 'DELIVERED': return 'Livré';
      default: return state;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'PLANNED': return 'text-gray-500';
      case 'TRANSIT': return 'text-primary';
      case 'INCIDENT': return 'text-red-600';
      case 'DELIVERED': return 'text-green-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <Marker
      position={[parcel.currentPosition.lat, parcel.currentPosition.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(),
      }}
    >
      {/* Tooltip on hover */}
      <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
        <div className="text-xs font-medium">
          📦 {parcel.trackingCode}
        </div>
      </Tooltip>

      {/* Popup on click */}
      <Popup>
        <div className="min-w-[200px] p-2">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
            <div className="bg-primary/10 p-1.5 rounded">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">{parcel.trackingCode}</p>
              <p className={`text-xs font-medium ${getStateColor(parcel.state)}`}>
                {getStateLabel(parcel.state)}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-xs">
            {/* Progress */}
            {parcel.state === 'TRANSIT' && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Progression</span>
                  <span className="font-semibold">{Math.round(parcel.progress * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${parcel.progress * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Distance */}
            {parcel.route && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">Distance:</span>
                <span className="font-semibold">{parcel.route.totalDistanceKm.toFixed(1)} km</span>
              </div>
            )}

            {/* Duration / ETA */}
            {parcel.route && parcel.state === 'TRANSIT' && parcel.estimatedArrival && (
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">ETA:</span>
                <span className="font-semibold">
                  {parcel.estimatedArrival.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            {/* Speed */}
            {parcel.state === 'TRANSIT' && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Vitesse:</span>
                <span className="font-semibold">{parcel.speed} km/h</span>
              </div>
            )}

            {/* Incidents */}
            {parcel.affectedByIncidents.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="font-semibold">
                    {parcel.affectedByIncidents.length} incident(s)
                  </span>
                </div>
              </div>
            )}

            {/* Delivered */}
            {parcel.state === 'DELIVERED' && parcel.actualArrival && (
              <div className="mt-2 pt-2 border-t border-gray-200 text-green-600">
                <p className="font-semibold">✓ Livré avec succès</p>
                <p className="text-xs">
                  {parcel.actualArrival.toLocaleString('fr-FR')}
                </p>
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}