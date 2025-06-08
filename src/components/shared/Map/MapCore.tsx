'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { TemperatureUnit, WeatherData, Location } from '@/types/weather';
import type { Map } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Dynamically import Map components with SSR disabled
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Shared map instance capture component
const SetMapInstance = dynamic(
  () => import('react-leaflet').then((mod) => {
    const Component = ({ 
      setMapInstance, 
      setIsMapReady 
    }: { 
      setMapInstance: (map: Map) => void;
      setIsMapReady: (ready: boolean) => void;
    }) => {
      const map = mod.useMap();
      
      React.useEffect(() => {
        if (map) {
          setMapInstance(map);
          setIsMapReady(true);
        }
      }, [map, setMapInstance, setIsMapReady]);
      
      return null;
    };
    
    return { default: Component };
  }),
  { ssr: false }
);

export interface MapCoreProps {
  center: [number, number];
  zoom: number;
  mapConfig: {
    tileLayer: {
      url: string;
      attribution: string;
      maxZoom: number;
    };
    controls: {
      zoomControl: boolean;
      attributionControl: boolean;
    };
  };
  className?: string;
  style?: React.CSSProperties;
  setMapInstance: (map: Map) => void;
  setIsMapReady: (ready: boolean) => void;
  children: React.ReactNode;
  isMobile?: boolean;
}

export interface MarkerData {
  position: [number, number];
  icon?: any;
  weatherData?: WeatherData | null;
  location?: {
    city?: string;
    country?: string;
  };
  onClick?: () => void;
}

export interface WeatherMarkerProps {
  marker: MarkerData;
  tempUnit: TemperatureUnit;
  convertTemp: (temp: number, unit: TemperatureUnit) => number;
}

// Shared Weather Marker Component
export const WeatherMarker: React.FC<WeatherMarkerProps> = ({
  marker,
  tempUnit,
  convertTemp,
}) => {
  return (
    <Marker
      position={marker.position}
      icon={marker.icon}
      eventHandlers={marker.onClick ? {
        click: marker.onClick
      } : undefined}
    >
      <Popup>
        <div className="text-center">
          <div className="font-bold">{marker.location?.city || 'Unknown Location'}</div>
          <div className="text-sm text-gray-600">{marker.location?.country}</div>
          {marker.weatherData && (
            <div className="mt-2">
              <div className="flex items-center gap-2 justify-center">
                <Image
                  src={marker.weatherData.currentWeather.icon}
                  alt={marker.weatherData.currentWeather.condition}
                  width={32}
                  height={32}
                />
                <span className="font-bold">
                  {Math.round(convertTemp(marker.weatherData.currentWeather.temperature, tempUnit))}°{tempUnit}
                </span>
              </div>
              <div className="text-sm mt-1">{marker.weatherData.currentWeather.condition}</div>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

// Main Map Core Component
export const MapCore: React.FC<MapCoreProps> = ({
  center,
  zoom,
  mapConfig,
  className = "z-[1000]",
  style = { height: '100%', width: '100%' },
  setMapInstance,
  setIsMapReady,
  children,
  isMobile = false,
}) => {
  const mapProps = {
    center,
    zoom,
    style,
    zoomControl: mapConfig.controls.zoomControl,
    attributionControl: mapConfig.controls.attributionControl,
    className,
    ...(isMobile && {
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
      boxZoom: false,
      keyboard: false,
      dragging: true,
    })
  };

  return (
    <MapContainer {...mapProps}>
      <TileLayer
        url={mapConfig.tileLayer.url}
        attribution={mapConfig.tileLayer.attribution}
        maxZoom={mapConfig.tileLayer.maxZoom}
      />
      
      <SetMapInstance 
        setMapInstance={setMapInstance} 
        setIsMapReady={setIsMapReady}
      />

      {children}
    </MapContainer>
  );
};

export default MapCore;
