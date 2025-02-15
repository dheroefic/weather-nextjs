'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useMapEvents } from 'react-leaflet';
import { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(
  () =>
    import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () =>
    import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () =>
    import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

interface MapComponentProps {
  selectedPosition: LatLng | null;
  onLocationSelect: (latlng: LatLng) => void;
  isVisible: boolean;
}

const MapEvents = ({ onLocationSelect }: { onLocationSelect: (latlng: LatLng) => void }) => {
  useMapEvents({
    click: (e) => onLocationSelect(e.latlng)
  });
  return null;
};

export default function MapComponent({ selectedPosition, onLocationSelect, isVisible }: MapComponentProps) {
  const mapKey = `map-${isVisible}-${selectedPosition?.lat}-${selectedPosition?.lng}`;

  return isVisible ? (
    <div className="flex-1 h-80 relative">
      <MapContainer
        key={mapKey}
        center={selectedPosition || [0, 0]}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
        className="rounded-r-lg overflow-hidden"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {selectedPosition && (
          <Marker position={selectedPosition} />
        )}
        <MapEvents onLocationSelect={onLocationSelect} />
      </MapContainer>
    </div>
  ) : null;
}
