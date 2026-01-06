/**
 * Parcel Creation Form
 * Form to create a new parcel and automatically calculate its route
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Package, Loader2 } from 'lucide-react';
import { LogisticsService, ParcelRequest, DriverResponse } from '@/lib/api-client';
import { GeoPointResponse, RouteResponse, ParcelResponse } from '@/lib/type';
import { toast } from 'react-hot-toast';

interface ParcelCreationFormProps {
  hubs: GeoPointResponse[];
  // route can be null when calculation fails — parcel still created server-side
  onParcelCreated: (parcel: ParcelResponse, route: RouteResponse | null) => void;
}

export default function ParcelCreationForm({
  hubs,
  onParcelCreated,
}: ParcelCreationFormProps) {
  const [formData, setFormData] = useState({
    senderName: '',
    senderPhone: '',
    recipientName: '',
    recipientPhone: '',
    pickupHubId: '',
    deliveryHubId: '',
    driverId: '',
    weightKg: 5,
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<DriverResponse[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);

  useEffect(() => {
    // Load drivers on component mount
    const loadDrivers = async () => {
      try {
        setDriversLoading(true);
        const driverList = await LogisticsService.getAllDrivers();
        setDrivers(driverList);
      } catch (error) {
        console.error('Error loading drivers:', error);
        toast.error('Impossible de charger la liste des livreurs');
      } finally {
        setDriversLoading(false);
      }
    };

    loadDrivers();
  }, []);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pickupHubId || !formData.deliveryHubId) {
      toast.error('Veuillez sélectionner origine et destination');
      return;
    }

    if (!formData.driverId) {
      toast.error('Veuillez sélectionner un livreur');
      return;
    }

    if (formData.pickupHubId === formData.deliveryHubId) {
      toast.error('Origine et destination doivent être différentes');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create parcel
      const parcelRequest: ParcelRequest = {
        senderName: formData.senderName,
        senderPhone: formData.senderPhone,
        recipientName: formData.recipientName,
        recipientPhone: formData.recipientPhone,
        pickupLocation: formData.pickupHubId,
        deliveryLocation: formData.deliveryHubId,
        weightKg: formData.weightKg,
        notes: formData.notes,
      };

      const parcel = await LogisticsService.createParcel(parcelRequest);

      // Defensive: ensure parcel id was returned by the backend
      if (!parcel?.id) {
        console.error('Parcel created but missing id:', parcel);
        toast.error('Le colis a été créé mais l\'identifiant est manquant');
        setLoading(false);
        return;
      }

      // Step 2: Calculate route
      let route: RouteResponse | null = null;
      try {
        route = await LogisticsService.calculateRoute({
          parcelId: parcel.id,
          startHubId: formData.pickupHubId,
          endHubId: formData.deliveryHubId,
          driverId: formData.driverId,
          constraints: {
            algorithm: 'OSRM',
            vehicleType: 'TRUCK',
          },
        });

        // Step 3: Notify parent with route
        onParcelCreated(parcel, route);
        toast.success('Colis créé et itinéraire calculé !');
      } catch (err: any) {
        // If route calculation failed due to no path (422), still add the parcel
        const status = err?.response?.status;
        const backendMsg = err?.response?.data?.message || err?.message;

        if (status === 422) {
          toast.error(backendMsg || 'Aucun itinéraire trouvé entre les hubs sélectionnés');
          // Notify parent with null route — parcel exists but has no route yet
          onParcelCreated(parcel, null);
        } else {
          // For other errors, surface the message but avoid overly noisy console.error
          console.warn('Route calculation error:', backendMsg || status || err?.message);
          toast.error(backendMsg ? `Erreur: ${backendMsg}` : 'Erreur lors de la création du colis');
          // still notify parent with null to reflect parcel presence
          onParcelCreated(parcel, null);
        }
      }

      // Reset form (done after parent notification)
      setFormData({
        senderName: '',
        senderPhone: '',
        recipientName: '',
        recipientPhone: '',
        pickupHubId: '',
        deliveryHubId: '',
        driverId: '',
        weightKg: 5,
        notes: '',
      });
    } catch (error: any) {
      console.error('Error creating parcel:', error);
      const backendMsg = error?.response?.data?.message || error?.message;
      toast.error(backendMsg ? `Erreur: ${backendMsg}` : 'Erreur lors de la création du colis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sender Info */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase">
            Expéditeur
          </label>
          <Input
            placeholder="Nom complet"
            value={formData.senderName}
            onChange={(e) => handleChange('senderName', e.target.value)}
            required
          />
          <Input
            placeholder="Téléphone"
            value={formData.senderPhone}
            onChange={(e) => handleChange('senderPhone', e.target.value)}
            required
          />
        </div>

        {/* Recipient Info */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase">
            Destinataire
          </label>
          <Input
            placeholder="Nom complet"
            value={formData.recipientName}
            onChange={(e) => handleChange('recipientName', e.target.value)}
            required
          />
          <Input
            placeholder="Téléphone"
            value={formData.recipientPhone}
            onChange={(e) => handleChange('recipientPhone', e.target.value)}
            required
          />
        </div>

        {/* Hubs Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase">
            Trajet
          </label>
          <select
            className="w-full px-3 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            value={formData.pickupHubId}
            onChange={(e) => handleChange('pickupHubId', e.target.value)}
            required
          >
            <option value="">🟢 Origine</option>
            {hubs.map(hub => (
              <option key={hub.id} value={hub.id}>
                {hub.address}
              </option>
            ))}
          </select>

          <select
            className="w-full px-3 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            value={formData.deliveryHubId}
            onChange={(e) => handleChange('deliveryHubId', e.target.value)}
            required
          >
            <option value="">🔴 Destination</option>
            {hubs.map(hub => (
              <option key={hub.id} value={hub.id}>
                {hub.address}
              </option>
            ))}
          </select>
        </div>

        {/* Driver Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase">
            Livreur assigné
          </label>
          <select
            className="w-full px-3 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            value={formData.driverId}
            onChange={(e) => handleChange('driverId', e.target.value)}
            required
            disabled={driversLoading}
          >
            <option value="">
              {driversLoading ? '⏳ Chargement des livreurs...' : '👤 Sélectionner un livreur'}
            </option>
            {drivers.map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.name} ({driver.status})
              </option>
            ))}
          </select>
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase">
            Poids (kg)
          </label>
          <Input
            type="number"
            min="0.1"
            step="0.1"
            value={formData.weightKg}
            onChange={(e) => handleChange('weightKg', parseFloat(e.target.value))}
            required
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase">
            Notes (optionnel)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
            rows={2}
            placeholder="Instructions spéciales..."
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full gap-2"
          disabled={loading || driversLoading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Création en cours...
            </>
          ) : (
            <>
              <Package className="w-4 h-4" />
              Créer le colis
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}