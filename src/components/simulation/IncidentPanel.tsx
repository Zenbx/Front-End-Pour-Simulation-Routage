/**
 * Incident Panel Component
 * UI for creating and managing incidents
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  AlertTriangle,
  MapPin,
  Activity,
  Wrench,
  Cloud,
  X,
  CheckCircle,
} from 'lucide-react';
import { Incident, IncidentType } from '@/lib/type';

interface IncidentPanelProps {
  incidents: Map<string, Incident>;
  incidentPlacementMode: boolean;
  selectedIncidentType: IncidentType | null;
  onActivateIncidentMode: (type: IncidentType) => void;
  onCancelIncidentMode: () => void;
  onResolveIncident: (incidentId: string) => void;
}

const INCIDENT_TYPES = [
  {
    type: 'ROAD_CLOSURE' as IncidentType,
    label: 'Route barrée',
    description: 'Fermeture complète de route',
    icon: MapPin,
    color: 'border-red-200 text-red-600 hover:bg-red-50',
  },
  {
    type: 'TRAFFIC' as IncidentType,
    label: 'Trafic dense',
    description: 'Embouteillages importants',
    icon: Activity,
    color: 'border-orange-200 text-orange-600 hover:bg-orange-50',
  },
  {
    type: 'VEHICLE_BREAKDOWN' as IncidentType,
    label: 'Panne véhicule',
    description: 'Problème mécanique',
    icon: Wrench,
    color: 'border-yellow-200 text-yellow-600 hover:bg-yellow-50',
  },
  {
    type: 'WEATHER' as IncidentType,
    label: 'Météo',
    description: 'Conditions défavorables',
    icon: Cloud,
    color: 'border-blue-200 text-blue-600 hover:bg-blue-50',
  },
];

export default function IncidentPanel({
  incidents,
  incidentPlacementMode,
  selectedIncidentType,
  onActivateIncidentMode,
  onCancelIncidentMode,
  onResolveIncident,
}: IncidentPanelProps) {
  const activeIncidents = Array.from(incidents.values()).filter(
    (i) => !i.resolved
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <AlertTriangle className="w-3 h-3" />
        Gestion des incidents
      </h2>

      {/* Incident Creation Buttons */}
      {!incidentPlacementMode ? (
        <div className="grid grid-cols-2 gap-2">
          {INCIDENT_TYPES.map((incident) => (
            <button
              key={incident.type}
              onClick={() => onActivateIncidentMode(incident.type)}
              className={`
                border-2 rounded-lg p-3 text-xs flex flex-col items-center gap-2
                transition-all hover:shadow-md active:scale-95
                ${incident.color}
              `}
            >
              <incident.icon className="w-5 h-5" />
              <span className="font-semibold">{incident.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">
                Mode placement actif
              </p>
              <p className="text-xs text-red-700">
                {INCIDENT_TYPES.find((i) => i.type === selectedIncidentType)?.label}
              </p>
            </div>
          </div>
          <p className="text-xs text-red-700 mb-3">
            🎯 Cliquez sur la carte pour placer l'incident
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelIncidentMode}
            className="w-full border-red-300 text-red-600 hover:bg-red-100"
          >
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
        </Card>
      )}

      {/* Active Incidents List */}
      {activeIncidents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-600 uppercase">
            Incidents actifs ({activeIncidents.length})
          </h3>
          <div className="space-y-2">
            {activeIncidents.map((incident) => {
              const config = INCIDENT_TYPES.find((i) => i.type === incident.type);
              const Icon = config?.icon || AlertTriangle;

              return (
                <Card
                  key={incident.id}
                  className="p-3 border-l-4 border-red-500 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-red-100 p-1.5 rounded">
                      <Icon className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">
                        {config?.label || incident.type}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {incident.description}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {incident.timestamp.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' • '}
                        Rayon: {incident.radius}m
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onResolveIncident(incident.id)}
                    className="w-full mt-2 text-xs border-green-200 text-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Résoudre
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No incidents message */}
      {activeIncidents.length === 0 && !incidentPlacementMode && (
        <Card className="p-4 bg-gray-50">
          <p className="text-xs text-gray-500 text-center italic">
            Aucun incident actif
          </p>
        </Card>
      )}
    </div>
  );
}