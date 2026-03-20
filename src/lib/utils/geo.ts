export interface LatLng {
  lat: number;
  lng: number;
}

/** Haversine distance in km between two points */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aCalc = sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Check if a point is within `radiusKm` of any point in a GeoJSON LineString */
export function isPointNearRoute(
  point: LatLng,
  routeGeometry: GeoJSON.LineString,
  radiusKm: number = 15,
): boolean {
  const coords = routeGeometry.coordinates;
  // Sample every 10th coordinate for performance
  for (let i = 0; i < coords.length; i += 10) {
    const routePoint: LatLng = { lat: coords[i][1], lng: coords[i][0] };
    if (haversineDistance(point, routePoint) <= radiusKm) {
      return true;
    }
  }
  // Always check last point
  const last = coords[coords.length - 1];
  if (haversineDistance(point, { lat: last[1], lng: last[0] }) <= radiusKm) {
    return true;
  }
  return false;
}

/** Find the route fraction (0-1) of the closest point on a route to a given point */
export function findRouteFraction(
  point: LatLng,
  routeGeometry: GeoJSON.LineString,
): number {
  const coords = routeGeometry.coordinates;
  let minDist = Infinity;
  let minIndex = 0;

  for (let i = 0; i < coords.length; i++) {
    const d = haversineDistance(point, { lat: coords[i][1], lng: coords[i][0] });
    if (d < minDist) {
      minDist = d;
      minIndex = i;
    }
  }

  return minIndex / (coords.length - 1);
}

/** Calculate bounding box for Italy default view */
export const ITALY_BOUNDS = {
  sw: { lat: 36.0, lng: 6.5 },
  ne: { lat: 47.5, lng: 18.8 },
};

export const ITALY_CENTER: LatLng = { lat: 42.0, lng: 12.5 };
