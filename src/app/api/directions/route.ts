import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.searchParams.get('origin'); // "lng,lat"
  const destination = request.nextUrl.searchParams.get('destination'); // "lng,lat"
  if (!origin || !destination) return errorResponse('MISSING_PARAMS', 'origin and destination required');

  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return errorResponse('CONFIG_ERROR', 'Mapbox token non configurato', 500);
  }

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin};${destination}?access_token=${token}&geometries=geojson&overview=full`;

    const response = await fetch(url);
    const data = await response.json();
    const route = data.routes?.[0];

    if (!route) return errorResponse('NO_ROUTE', 'Nessun percorso trovato');

    return successResponse({
      geometry: route.geometry, // GeoJSON LineString
      distance: route.distance / 1000, // km
      duration: Math.round(route.duration / 60), // minutes
    });
  } catch (error) {
    console.error('Directions error:', error);
    return errorResponse('DIRECTIONS_ERROR', 'Errore nel calcolo percorso', 500);
  }
}
