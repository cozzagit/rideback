'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { Plus, Route, Calendar } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trips')
      .then((res) => res.json())
      .then((data) => setTrips(data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    scheduled: 'info',
    active: 'success',
    completed: 'default',
    cancelled: 'danger',
  };

  const statusLabels: Record<string, string> = {
    scheduled: 'Programmato',
    active: 'In corso',
    completed: 'Completato',
    cancelled: 'Annullato',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Viaggi</h1>
          <p className="text-sm text-slate-500 mt-1">I tuoi rientri pianificati</p>
        </div>
        <Link href="/trips/new">
          <Button>
            <Plus className="h-4 w-4" />
            Nuovo viaggio
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : trips.length === 0 ? (
        <EmptyState
          icon={<Route className="h-12 w-12" />}
          title="Nessun viaggio"
          description="Crea il tuo primo viaggio di ritorno per iniziare a guadagnare"
          action={
            <Link href="/trips/new">
              <Button><Plus className="h-4 w-4" /> Crea viaggio</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <Card hover className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    {trip.originCity} &rarr; {trip.destinationCity}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(trip.departureAt)} &mdash; {formatTime(trip.departureAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusColors[trip.status] || 'default'}>
                    {statusLabels[trip.status] || trip.status}
                  </Badge>
                  <span className="text-sm text-slate-400">
                    {trip.seatsBooked}/{trip.seatsAvailable + trip.seatsBooked} posti
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
