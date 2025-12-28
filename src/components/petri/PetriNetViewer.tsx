/**
 * Petri Net Viewer Component
 * Visualization of Petri Net states and transitions (Preparation for future API)
 */

'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Activity, Circle, ArrowRight, Clock } from 'lucide-react';

interface PetriNetViewerProps {
  entityId?: string;
  enabled?: boolean;
}

export default function PetriNetViewer({
  entityId,
  enabled = false,
}: PetriNetViewerProps) {
  // Mock Petri Net for demonstration
  const mockPlaces = [
    { id: 'planned', name: 'PLANNED', tokens: 0, active: false },
    { id: 'pickup', name: 'PICKUP', tokens: 0, active: false },
    { id: 'transit', name: 'TRANSIT', tokens: 1, active: true },
    { id: 'delivery', name: 'DELIVERY', tokens: 0, active: false },
    { id: 'delivered', name: 'DELIVERED', tokens: 0, active: false },
  ];

  const mockTransitions = [
    { from: 'planned', to: 'pickup', name: 'assign_driver' },
    { from: 'pickup', to: 'transit', name: 'start_delivery' },
    { from: 'transit', to: 'delivery', name: 'arrive_destination' },
    { from: 'delivery', to: 'delivered', name: 'confirm_delivery' },
  ];

  if (!enabled) {
    return (
      <Card className="p-4 bg-gray-50 border-dashed">
        <div className="text-center">
          <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">
            Petri Net Engine
          </p>
          <span className="inline-block bg-gray-400 text-white text-[9px] px-2 py-0.5 rounded">
            DISABLED
          </span>
          <p className="text-[10px] text-gray-400 mt-2 italic">
            L'API de transition d'états sera connectée prochainement.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Réseau de Petri
        </h3>
        <span className="bg-green-500 text-white text-[9px] px-2 py-0.5 rounded font-bold">
          ACTIVE
        </span>
      </div>

      {entityId && (
        <p className="text-xs text-gray-500 mb-3">
          Entity: <span className="font-mono font-semibold">{entityId}</span>
        </p>
      )}

      {/* Petri Net Visualization */}
      <div className="space-y-3">
        {mockPlaces.map((place, index) => (
          <div key={place.id}>
            {/* Place */}
            <div className="flex items-center gap-3">
              <div
                className={`
                  relative w-10 h-10 rounded-full border-2 flex items-center justify-center
                  ${place.active
                    ? 'border-primary bg-primary-light'
                    : 'border-gray-300 bg-white'
                  }
                `}
              >
                <Circle
                  className={`w-5 h-5 ${place.active ? 'text-primary' : 'text-gray-400'}`}
                  fill={place.tokens > 0 ? 'currentColor' : 'none'}
                />
                {place.tokens > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {place.tokens}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <p
                  className={`text-xs font-bold ${
                    place.active ? 'text-primary' : 'text-gray-600'
                  }`}
                >
                  {place.name}
                </p>
                <p className="text-[10px] text-gray-400">
                  {place.active ? 'État actuel' : 'Inactif'}
                </p>
              </div>
            </div>

            {/* Transition arrow */}
            {index < mockPlaces.length - 1 && (
              <div className="ml-5 my-1 flex items-center gap-2 text-gray-400">
                <ArrowRight className="w-3 h-3" />
                <span className="text-[9px] font-mono">
                  {mockTransitions[index]?.name}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Transition Log */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <h4 className="text-[10px] font-bold text-gray-600 uppercase mb-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Historique des transitions
        </h4>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          <LogEntry time="14:32:10" transition="start_delivery" />
          <LogEntry time="14:30:45" transition="assign_driver" />
          <LogEntry time="14:30:12" transition="create_parcel" />
        </div>
      </div>
    </Card>
  );
}

function LogEntry({ time, transition }: { time: string; transition: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
      <span className="text-gray-400">{time}</span>
      <ArrowRight className="w-2.5 h-2.5" />
      <span className="font-semibold">{transition}</span>
    </div>
  );
}