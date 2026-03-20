'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

interface TripFeature {
  type: 'Feature';
  geometry: GeoJSON.LineString;
  properties: {
    id: string;
    originCity: string;
    destinationCity: string;
    departureAt: string;
    seatsAvailable: number;
    pricePerSeat: number;
    companyName: string;
    vehicle: string;
  };
}

interface TripRouteLayerProps {
  map: mapboxgl.Map | null;
  trips: { type: 'FeatureCollection'; features: TripFeature[] };
  hoveredTripId?: string | null;
  onTripClick?: (tripId: string, lngLat: mapboxgl.LngLat) => void;
  onTripHover?: (tripId: string | null) => void;
}

export const ROUTE_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
];

const SOURCE_ID = 'trips-source';
const LAYER_ID = 'trips-routes';
const GLOW_LAYER_ID = 'trips-routes-glow';
const HIGHLIGHT_LAYER_ID = 'trips-routes-highlight';
const DOTS_LAYER_ID = 'trips-origin-dots';
const DEST_DOTS_LAYER_ID = 'trips-dest-dots';
const HOVER_TAG_ID = 'trip-hover-tag';

function formatPriceBrief(cents: number): string {
  return `€${Math.round(cents / 100)}`;
}
function formatTimeBrief(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function TripRouteLayer({ map, trips, hoveredTripId, onTripClick, onTripHover }: TripRouteLayerProps) {
  const hoverTagRef = useRef<mapboxgl.Popup | null>(null);
  const currentHoverIdRef = useRef<string | null>(null);

  // ── Build layers when trips change ────────────────────────────────────
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    // Clean up existing
    for (const id of [HIGHLIGHT_LAYER_ID, DOTS_LAYER_ID, DEST_DOTS_LAYER_ID, GLOW_LAYER_ID, LAYER_ID]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    for (const id of [SOURCE_ID, 'trip-origin-dots', 'trip-dest-dots']) {
      if (map.getSource(id)) map.removeSource(id);
    }

    if (trips.features.length === 0) return;

    // Assign colors
    const coloredFeatures = trips.features.map((f, i) => ({
      ...f,
      properties: { ...f.properties, color: ROUTE_COLORS[i % ROUTE_COLORS.length] },
    }));

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: coloredFeatures },
    });

    // Glow
    map.addLayer({
      id: GLOW_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 8,
        'line-opacity': 0.15,
        'line-blur': 6,
      },
    });

    // Main routes
    map.addLayer({
      id: LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3,
        'line-opacity': 0.8,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });

    // Highlight layer (invisible until hovered)
    map.addLayer({
      id: HIGHLIGHT_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 6,
        'line-opacity': 0.9,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      filter: ['==', ['get', 'id'], ''],
    });

    // Origin dots
    const originPoints = coloredFeatures.map((f) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: f.geometry.coordinates[0] },
      properties: { color: f.properties.color, id: f.properties.id },
    }));
    const destPoints = coloredFeatures.map((f) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: f.geometry.coordinates[f.geometry.coordinates.length - 1] },
      properties: { color: f.properties.color, id: f.properties.id },
    }));

    map.addSource('trip-origin-dots', { type: 'geojson', data: { type: 'FeatureCollection', features: originPoints } });
    map.addSource('trip-dest-dots', { type: 'geojson', data: { type: 'FeatureCollection', features: destPoints } });

    map.addLayer({
      id: DOTS_LAYER_ID,
      type: 'circle',
      source: 'trip-origin-dots',
      paint: { 'circle-radius': 5, 'circle-color': ['get', 'color'], 'circle-stroke-width': 2, 'circle-stroke-color': '#0f172a' },
    });
    map.addLayer({
      id: DEST_DOTS_LAYER_ID,
      type: 'circle',
      source: 'trip-dest-dots',
      paint: { 'circle-radius': 5, 'circle-color': ['get', 'color'], 'circle-stroke-width': 2, 'circle-stroke-color': '#0f172a' },
    });

    // ── Route interaction handlers ────────────────────────────────────────
    const onClick = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      const tripId = e.features[0].properties?.id;
      if (tripId && onTripClick) onTripClick(tripId, e.lngLat);
    };

    const onMouseMove = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties;
      if (!props) return;
      const tripId = props.id as string;

      map.getCanvas().style.cursor = 'pointer';

      // Notify parent for sidebar highlight
      if (tripId !== currentHoverIdRef.current) {
        currentHoverIdRef.current = tripId;
        onTripHover?.(tripId);
      }

      // Show Airbnb-style price tag
      const html = `
        <div style="
          background: #0f172a; border: 1px solid #334155; border-radius: 12px;
          padding: 8px 12px; font-family: Inter, system-ui, sans-serif;
          box-shadow: 0 8px 24px rgba(0,0,0,.5); pointer-events: none;
          min-width: 140px;
        ">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${props.color}"></div>
            <span style="color:#fff;font-size:12px;font-weight:700;">${props.originCity}</span>
            <span style="color:#475569;font-size:10px;">→</span>
            <span style="color:#fff;font-size:12px;font-weight:700;">${props.destinationCity}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px; font-size:11px; color:#94a3b8;">
            <span>${formatTimeBrief(props.departureAt)}</span>
            <span>·</span>
            <span>${props.seatsAvailable} posti</span>
          </div>
          <div style="margin-top:4px;font-size:15px;font-weight:800;color:#f59e0b;">
            ${formatPriceBrief(props.pricePerSeat)}<span style="font-size:10px;font-weight:400;color:#64748b;margin-left:2px;">/posto</span>
          </div>
        </div>`;

      if (hoverTagRef.current) {
        hoverTagRef.current.setLngLat(e.lngLat).setHTML(html);
      } else {
        hoverTagRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 16,
          className: 'trip-hover-popup',
        })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      }
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      currentHoverIdRef.current = null;
      onTripHover?.(null);
      hoverTagRef.current?.remove();
      hoverTagRef.current = null;
    };

    map.on('click', LAYER_ID, onClick);
    map.on('click', HIGHLIGHT_LAYER_ID, onClick);
    map.on('mousemove', LAYER_ID, onMouseMove);
    map.on('mouseleave', LAYER_ID, onMouseLeave);

    return () => {
      map.off('click', LAYER_ID, onClick);
      map.off('click', HIGHLIGHT_LAYER_ID, onClick);
      map.off('mousemove', LAYER_ID, onMouseMove);
      map.off('mouseleave', LAYER_ID, onMouseLeave);
      hoverTagRef.current?.remove();
      hoverTagRef.current = null;
      for (const id of [HIGHLIGHT_LAYER_ID, DOTS_LAYER_ID, DEST_DOTS_LAYER_ID, GLOW_LAYER_ID, LAYER_ID]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      for (const id of [SOURCE_ID, 'trip-origin-dots', 'trip-dest-dots']) {
        if (map.getSource(id)) map.removeSource(id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, trips]);

  // ── React to hoveredTripId changes (from sidebar or map) ──────────────
  useEffect(() => {
    if (!map || !map.getLayer(HIGHLIGHT_LAYER_ID)) return;

    if (hoveredTripId) {
      // Show highlight layer for hovered trip
      map.setFilter(HIGHLIGHT_LAYER_ID, ['==', ['get', 'id'], hoveredTripId]);
      // Dim non-hovered routes
      map.setPaintProperty(LAYER_ID, 'line-opacity', [
        'case', ['==', ['get', 'id'], hoveredTripId], 0.9, 0.25,
      ]);
      map.setPaintProperty(GLOW_LAYER_ID, 'line-opacity', [
        'case', ['==', ['get', 'id'], hoveredTripId], 0.3, 0.05,
      ]);
    } else {
      // Reset
      map.setFilter(HIGHLIGHT_LAYER_ID, ['==', ['get', 'id'], '']);
      map.setPaintProperty(LAYER_ID, 'line-opacity', 0.8);
      map.setPaintProperty(GLOW_LAYER_ID, 'line-opacity', 0.15);
    }
  }, [map, hoveredTripId]);

  return null;
}

export default TripRouteLayer;
