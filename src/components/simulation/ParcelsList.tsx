/**
 * Parcels List Component
 * Display all parcels with their status
 */

'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import {
  Package,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { SimulatedParcel } from '../../lib/type';

interface ParcelsListProps {
  parcels: Map<string, SimulatedParcel>;
  selectedParcelId: string | null;
  onParcelClick: (parcelId: string) => void;
}

export default function ParcelsList({
  parcels,
  selectedParcelId,
  onParcelClick,
}: ParcelsListProps) {
  const parcelsArray = Array.from(parcels.values());

  // Sort: TRANSIT first, then INCIDENT, then PLANNED, then DELIVERED
  const sortedParcels = parcelsArray.sort((a, b) => {
    const order = { TRANSIT: 0, INCIDENT: 1, PLANNED: 2, DELIVERED: 3, FAILED: 4 };
    return order[a.state] - order[b.state];
  });

  const getStateConfig = (state: string) => {
    switch (state) {
      case 'PLANNED':
        return {
          label: 'Planifié',
          icon: Clock,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          dotColor: 'bg-gray-400',
        };
      case 'TRANSIT':
        return {
          label: 'En transit',
          icon: Package,
          color: 'text-primary',
          bgColor: 'bg-primary-light',
          dotColor: 'bg-primary',
        };
      case 'INCIDENT':
        return {
          label: 'Incident',
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          dotColor: 'bg-red-500',
        };
      case 'DELIVERED':
        return {
          label: 'Livré',
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          dotColor: 'bg-green-500',
        };
      default:
        return {
          label: state,
          icon: Package,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          dotColor: 'bg-gray-400',
        };
    }
  };

  if (parcelsArray.length === 0) {
    return (
      <Card className="p-6 bg-gray-50">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">
            Aucun colis actif
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Créez un colis pour démarrer la simulation
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {sortedParcels.map((parcel) => {
        const config = getStateConfig(parcel.state);
        const Icon = config.icon;
        const isSelected = parcel.id === selectedParcelId;

        return (
          <Card
            key={parcel.id}
            className={`
              p-3 cursor-pointer transition-all hover:shadow-md
              ${isSelected ? 'ring-2 ring-primary bg-primary-light/20' : 'hover:bg-gray-50'}
            `}
            onClick={() => onParcelClick(parcel.id)}
          >
            <div className="flex items-center gap-3">
              {/* Status indicator */}
              <div className="relative flex-shrink-0">
                <div className={`${config.bgColor} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                {parcel.state === 'TRANSIT' && (
                  <div
                    className={`
                      absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                      ${config.dotColor} animate-pulse
                    `}
                  />
                )}
              </div>

              {/* Parcel info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {parcel.trackingCode}
                  </p>
                  <ChevronRight
                    className={`
                      w-4 h-4 flex-shrink-0 transition-transform
                      ${isSelected ? 'rotate-90' : ''}
                      ${config.color}
                    `}
                  />
                </div>

                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-xs font-semibold ${config.color}`}>
                    {config.label}
                  </span>
                  {parcel.affectedByIncidents.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">
                      {parcel.affectedByIncidents.length} incident(s)
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {parcel.state === 'TRANSIT' && (
                  <div className="space-y-1">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${parcel.progress * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>{Math.round(parcel.progress * 100)}%</span>
                      {parcel.route && (
                        <span>{parcel.route.totalDistanceKm.toFixed(1)} km</span>
                      )}
                    </div>
                  </div>
                )}

                {/* ETA */}
                {parcel.state === 'TRANSIT' && parcel.estimatedArrival && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      ETA:{' '}
                      {parcel.estimatedArrival.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                {/* Delivered info */}
                {parcel.state === 'DELIVERED' && parcel.actualArrival && (
                  <p className="text-xs text-green-600 font-medium mt-1">
                    ✓ Livré à{' '}
                    {parcel.actualArrival.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}