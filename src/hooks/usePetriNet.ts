import { useState, useEffect, useCallback } from 'react';
import { PetriNetService } from '../lib/api-client';
import { PetriNetState } from '../lib/type';
import { toast } from 'react-hot-toast';

export function usePetriNet(netId?: string) {
    const [state, setState] = useState<PetriNetState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchState = useCallback(async () => {
        if (!netId) return;
        setIsLoading(true);
        try {
            const netState = await PetriNetService.getState(netId);
            setState(netState);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch Petri net state:', err);
            setError('Erreur lors de la récupération de l\'état du réseau');
        } finally {
            setIsLoading(false);
        }
    }, [netId]);

    const fireTransition = useCallback(async (transitionId: string, binding: Record<string, any[]> = {}) => {
        if (!netId) return;
        try {
            await PetriNetService.triggerTransition(netId, transitionId, binding);
            await fetchState(); // Refresh state after transition
        } catch (err) {
            console.error('Failed to fire transition:', err);
            toast.error('Erreur lors du déclenchement de la transition');
        }
    }, [netId, fetchState]);

    useEffect(() => {
        if (netId) {
            fetchState();
            // Polling for real-time updates (optional)
            const interval = setInterval(fetchState, 5000);
            return () => clearInterval(interval);
        }
    }, [netId, fetchState]);

    return {
        state,
        isLoading,
        error,
        actions: {
            refresh: fetchState,
            fireTransition,
        }
    };
}
