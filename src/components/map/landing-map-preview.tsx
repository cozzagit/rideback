'use client';

import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ITALY_CENTER, ITALY_ZOOM, MAPBOX_STYLE } from '@/lib/constants';

export function LandingMapPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: ITALY_CENTER,
      zoom: ITALY_ZOOM,
      interactive: false,
      attributionControl: false,
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative rounded-3xl border border-slate-800 overflow-hidden aspect-square">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30 pointer-events-none" />
      <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
        <p className="text-sm font-medium text-amber-500">Esplora i viaggi</p>
        <p className="text-xs text-slate-400 mt-1">Rientri NCC disponibili in tutta Italia</p>
      </div>
    </div>
  );
}
