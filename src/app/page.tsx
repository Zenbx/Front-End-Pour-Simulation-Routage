/**
 * Main Dashboard Page
 * Complete logistics simulation interface
 */

'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Truck, Plus, History, Activity } from 'lucide-react';
import { useSimulation } from '@/hooks/useSimulation';
import ParcelCreationForm from '@/components/forms/ParcelCreationForm';
import SimulationControls from '@/components/simulation/SimulationControls';
import IncidentPanel from '@/components/simulation/IncidentPanel';
import ParcelsList from '@/components/simulation/ParcelsList';
import PetriNetViewer from '@/components/petri/PetriNetViewer';
import { SimulationEngine } from '@/lib/simulation-engine';
import { Toaster } from 'react-hot-toast';

// Dynamically import map to avoid SSR issues
const EnhancedMap = dynamic(
  () => import('@/components/simulation/EnhancedMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center rounded-lg">
        <p className="text-gray-500">Chargement de la carte...</p>
      </div>
    ),
  }
);

// Initial map view constants
const INITIAL_CENTER: [number, number] = [4.05, 9.70]; // Douala (where most hubs are now)
const INITIAL_ZOOM = 13;

export default function Dashboard() {
  const { state, actions } = useSimulation();

  // Load hubs on mount
  useEffect(() => {
    actions.loadHubs();
  }, [actions]);

  // Calculate simulation stats
  const stats = SimulationEngine.getSimulationStats(state.parcels);

  return (
    <>
      <Toaster position="top-right" />

      <div className="flex h-screen bg-gray-50 font-sans text-foreground">
        {/* LEFT SIDEBAR - Control Panel */}
        <aside className="w-96 bg-white border-r border-outline flex flex-col elevation-1 z-10 overflow-hidden">
          {/* Header */}
          <header className="p-6 border-b border-outline flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg">
                <Truck className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-primary">
                  TiibnTick
                </h1>
                <span className="text-foreground font-light text-sm uppercase tracking-widest">
                  Simulateur
                </span>
              </div>
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Section: New Parcel */}
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Plus className="w-3 h-3" />
                Nouveau Colis
              </h2>
              <ParcelCreationForm
                hubs={state.hubs}
                onParcelCreated={(parcel, route) => {
                  actions.addParcel(parcel, route ?? null);
                }}
              />
            </section>

            {/* Section: Simulation Controls */}
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity className="w-3 h-3" />
                Contrôles de simulation
              </h2>
              <SimulationControls
                isPlaying={state.isPlaying}
                speed={state.speed}
                stats={stats}
                onPlay={actions.play}
                onPause={actions.pause}
                onSpeedChange={actions.setSpeed}
              />
            </section>

            {/* Section: Incidents */}
            <section>
              <IncidentPanel
                incidents={state.incidents}
                incidentPlacementMode={state.incidentPlacementMode}
                selectedIncidentType={state.selectedIncidentType}
                onActivateIncidentMode={actions.toggleIncidentMode}
                onCancelIncidentMode={() => actions.toggleIncidentMode(null)}
                onResolveIncident={actions.resolveIncident}
              />
            </section>

            {/* Section: Active Parcels */}
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <History className="w-3 h-3" />
                Colis Actifs ({state.parcels.size})
              </h2>
              <ParcelsList
                parcels={state.parcels}
                selectedParcelId={state.selectedParcelId}
                onParcelClick={actions.selectParcel}
              />
            </section>

            {/* Section: Petri Net (Preparation) */}
            <section>
              <PetriNetViewer
                entityId={state.selectedParcelId || undefined}
                enabled={true}
              />
            </section>
          </div>
        </aside>

        {/* MAIN AREA - Map */}
        <main className="flex-1 p-6 relative">
          <div className="h-full w-full rounded-2xl overflow-hidden elevation-2 bg-white relative">
            <EnhancedMap
              center={INITIAL_CENTER}
              zoom={INITIAL_ZOOM}
              parcels={state.parcels}
              incidents={state.incidents}
              hubs={state.hubs}
              selectedParcelId={state.selectedParcelId}
              incidentPlacementMode={state.incidentPlacementMode}
              selectedIncidentType={state.selectedIncidentType}
              onParcelClick={actions.selectParcel}
              onIncidentPlace={actions.createIncident}
              onIncidentClick={(id) => {
                console.log('Incident clicked:', id);
              }}
            />

            {/* Overlay: Global Status */}
            <div className="absolute top-6 right-6 z-[400] bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-outline elevation-2 min-w-[220px]">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                Status Global
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {stats.inTransit}
                  </p>
                  <p className="text-xs text-gray-600">En transit</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.delivered}
                  </p>
                  <p className="text-xs text-gray-600">Livrés</p>
                </div>
              </div>
              {stats.withIncidents > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-lg font-bold text-red-600">
                    ⚠️ {stats.withIncidents} incident(s)
                  </p>
                </div>
              )}
            </div>

            {/* Overlay: Legend */}
            <div className="absolute bottom-6 left-6 z-[400] bg-white/95 backdrop-blur-sm p-3 rounded-lg border border-outline elevation-1">
              <p className="text-xs font-bold text-gray-600 mb-2">Légende</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span>Hubs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary border-2 border-white" />
                  <span>Colis en transit</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-primary" />
                  <span>Itinéraire</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600" />
                  <span>Incident</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}