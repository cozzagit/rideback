'use client';

import useSWR from 'swr';

const fetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .then((d) => d.data);

export function useTripsOnMap(date: string) {
  const { data, error, isLoading } = useSWR(
    date ? `/api/trips/map?date=${date}` : null,
    fetcher,
    { refreshInterval: 60000 },
  );

  return { geojson: data as GeoJSON.FeatureCollection | null, error, isLoading };
}
