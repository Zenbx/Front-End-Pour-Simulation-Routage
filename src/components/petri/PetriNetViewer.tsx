import React, { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Activity, Circle, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { usePetriNet } from '@/hooks/usePetriNet';
import { useSimulation } from '@/hooks/useSimulation';

interface PetriNetViewerProps {
  entityId?: string;
  enabled?: boolean;
}

export default function PetriNetViewer({
  entityId,
  enabled = true,
}: PetriNetViewerProps) {
  const { state: simState } = useSimulation();

  // Find the petriNetId for the selected parcel
  const petriNetId = useMemo(() => {
    if (!entityId) return undefined;
    const parcel = simState.parcels.get(entityId);
    return parcel?.parcelData?.petriNetId;
  }, [entityId, simState.parcels]);

  const { state: netState, isLoading, actions } = usePetriNet(petriNetId);

  // Default places if netId is null but enabled
  const places = useMemo(() => {
    if (!netState) return [];

    // Convert marking to a list of places with token counts
    // For standard flow: CREATED, PLANNED, IN_TRANSIT, DELIVERED, RETURNED
    const standardPlaces = ['PLANNED', 'PENDING_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'];

    return standardPlaces.map(pId => ({
      id: pId,
      name: pId,
      tokens: netState.marking[pId] || [],
      active: (netState.marking[pId]?.length || 0) > 0
    }));
  }, [netState]);

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
        </div>
      </Card>
    );
  }

  if (!entityId) {
    return (
      <Card className="p-6 bg-gray-50 border-dashed flex flex-col items-center justify-center text-center">
        <Activity className="w-8 h-8 text-gray-300 mb-3" />
        <p className="text-xs font-bold text-gray-500 uppercase">
          Aucun colis sélectionné
        </p>
        <p className="text-[10px] text-gray-400 mt-1 max-w-[150px]">
          Sélectionnez un colis pour voir son cycle de vie Petri Net
        </p>
      </Card>
    );
  }

  if (isLoading && !netState) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </Card>
    );
  }

  if (!petriNetId) {
    return (
      <Card className="p-6 bg-red-50 border-red-100 flex flex-col items-center justify-center text-center">
        <Activity className="w-8 h-8 text-red-200 mb-3" />
        <p className="text-xs font-bold text-red-600 uppercase">
          Pas de PetriNet ID
        </p>
        <p className="text-[10px] text-red-400 mt-1">
          Ce colis n'a pas été initialisé avec un réseau de Petri.
        </p>
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
          {isLoading ? 'SYNCING...' : 'ACTIVE'}
        </span>
      </div>

      <div className="flex items-center justify-between mb-3 text-[10px] text-gray-500">
        <span>Net: <span className="font-mono">{petriNetId.substring(0, 8)}...</span></span>
        <span>Time: {netState?.currentTime || 0}</span>
      </div>

      <div className="space-y-4">
        {places.length === 0 && !isLoading && (
          <p className="text-center text-xs text-gray-400 italic">Structure du réseau introuvable</p>
        )}

        {places.map((place, index) => (
          <div key={place.id}>
            <div className="flex items-center gap-3">
              <div
                className={`
                  relative w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all
                  ${place.active
                    ? 'border-primary bg-primary-light shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]'
                    : 'border-gray-300 bg-white'
                  }
                `}
              >
                <Circle
                  className={`w-5 h-5 ${place.active ? 'text-primary' : 'text-gray-400'}`}
                  fill={place.tokens.length > 0 ? 'currentColor' : 'none'}
                />
                {place.tokens.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {place.tokens.length}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <p
                  className={`text-xs font-bold ${place.active ? 'text-primary' : 'text-gray-600'
                    }`}
                >
                  {place.name}
                </p>
                <p className="text-[10px] text-gray-400">
                  {place.active ? 'État actuel' : 'Inactif'}
                </p>
              </div>
            </div>

            {index < places.length - 1 && (
              <div className="ml-5 my-1 flex items-center gap-2 text-gray-300">
                <div className="w-0.5 h-4 bg-gray-200 ml-1.5" />
              </div>
            )}
          </div>
        ))}
      </div>

      {netState && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => actions.refresh()}
            className="w-full text-[10px] text-primary hover:underline"
          >
            Actualiser manuellement
          </button>
        </div>
      )}
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