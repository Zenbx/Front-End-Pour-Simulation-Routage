/**
 * Simulation Controls Component
 * Play/pause, speed control, and simulation stats
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Play, Pause, Zap } from 'lucide-react';
import { SimulationStats } from '../../lib/type';

interface SimulationControlsProps {
  isPlaying: boolean;
  speed: number;
  stats: SimulationStats;
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (speed: number) => void;
}

const SPEED_OPTIONS = [
  { value: 1, label: '1x', icon: '🐢' },
  { value: 2, label: '2x', icon: '🚶' },
  { value: 5, label: '5x', icon: '🏃' },
  { value: 10, label: '10x', icon: '🚀' },
];

export default function SimulationControls({
  isPlaying,
  speed,
  stats,
  onPlay,
  onPause,
  onSpeedChange,
}: SimulationControlsProps) {
  return (
    <div className="bg-white rounded-xl border border-outline elevation-2 p-4 space-y-4">
      {/* Play/Pause Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant={isPlaying ? 'outline' : 'primary'}
          size="sm"
          onClick={isPlaying ? onPause : onPlay}
          className="flex-1"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Démarrer
            </>
          )}
        </Button>

        {/* Speed Control */}
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-gray-400" />
          {SPEED_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onSpeedChange(option.value)}
              className={`
                px-2.5 py-1 rounded-md text-xs font-semibold transition-all
                ${speed === option.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
              title={option.label}
            >
              {option.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="En transit"
          value={stats.inTransit}
          color="text-primary"
          emoji="🚚"
        />
        <StatCard
          label="Livrés"
          value={stats.delivered}
          color="text-green-600"
          emoji="✅"
        />
        <StatCard
          label="Incidents"
          value={stats.withIncidents}
          color="text-red-600"
          emoji="⚠️"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
        <div className="text-xs">
          <p className="text-gray-500 mb-0.5">Distance totale</p>
          <p className="font-bold text-sm">
            {stats.totalDistance.toFixed(1)} km
          </p>
        </div>
        <div className="text-xs">
          <p className="text-gray-500 mb-0.5">Vitesse moy.</p>
          <p className="font-bold text-sm">
            {stats.averageSpeed.toFixed(0)} km/h
          </p>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-200">
        <div
          className={`
            w-2 h-2 rounded-full
            ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}
          `}
        />
        <span className="text-xs font-medium text-gray-600">
          {isPlaying ? 'Simulation active' : 'Simulation en pause'}
        </span>
        {speed > 1 && isPlaying && (
          <span className="text-xs font-bold text-primary">
            {speed}x
          </span>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  emoji: string;
}

function StatCard({ label, value, color, emoji }: StatCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
      <div className="text-lg mb-0.5">{emoji}</div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide">
        {label}
      </p>
    </div>
  );
}