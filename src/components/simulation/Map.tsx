'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js
const fixLeafletIcons = () => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
};

interface MapProps {
    center?: [number, number];
    zoom?: number;
    markers?: Array<{
        position: [number, number];
        label: string;
        type?: 'hub' | 'parcel' | 'driver';
    }>;
    polylines?: Array<{
        positions: Array<[number, number]>;
        color?: string;
    }>;
}

const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};

export default function Map({
    center = [3.848, 11.502], // Yaoundé default
    zoom = 13,
    markers = [],
    polylines = []
}: MapProps) {

    useEffect(() => {
        fixLeafletIcons();
    }, []);

    return (
        <div className="h-full w-full rounded-lg overflow-hidden border border-outline elevation-1">
            <MapContainer
                center={center}
                zoom={zoom}
                className="h-full w-full z-0"
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater center={center} zoom={zoom} />

                {markers.map((marker, idx) => (
                    <Marker key={idx} position={marker.position}>
                        <Popup>
                            <div className="font-medium">{marker.label}</div>
                            {marker.type && <div className="text-xs text-gray-500 uppercase">{marker.type}</div>}
                        </Popup>
                    </Marker>
                ))}

                {polylines.map((polyline, idx) => (
                    <Polyline
                        key={idx}
                        positions={polyline.positions}
                        color={polyline.color || '#FF9800'}
                        weight={4}
                        opacity={0.8}
                    />
                ))}
            </MapContainer>
        </div>
    );
}
