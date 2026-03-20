'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ITALY_CENTER, ITALY_ZOOM, MAPBOX_STYLE } from '@/lib/constants';

interface MapContainerProps {
  onMapReady?: (map: mapboxgl.Map) => void;
  className?: string;
}

export function MapContainer({ onMapReady, className }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center: ITALY_CENTER,
      zoom: ITALY_ZOOM,
      pitch: 0,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'bottom-right'
    );

    map.current.on('load', () => {
      if (map.current && onMapReady) {
        onMapReady(map.current);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mapContainer} className={className || 'w-full h-full'} />;
}

export default MapContainer;
