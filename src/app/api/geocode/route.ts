import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) return errorResponse('MISSING_QUERY', 'Query parameter q is required');

  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return errorResponse('CONFIG_ERROR', 'Mapbox token non configurato', 500);
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=IT&language=it&limit=5`;

    const response = await fetch(url);
    const data = await response.json();

    return successResponse(
      data.features?.map((f: Record<string, unknown>) => ({
        id: f.id,
        placeName: f.place_name,
        center: f.center, // [lng, lat]
        text: f.text,
      })) || [],
    );
  } catch (error) {
    console.error('Geocode error:', error);
    return errorResponse('GEOCODE_ERROR', 'Errore nel geocoding', 500);
  }
}
