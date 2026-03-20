'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, Map, MapPin, ArrowRight, Calendar } from 'lucide-react';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bookings')
      .then((res) => res.json())
      .then((data) => setBookings(data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'danger',
    completed: 'default',
    no_show: 'danger',
  };

  const statusLabels: Record<string, string> = {
    pending: 'In attesa',
    confirmed: 'Confermato',
    cancelled: 'Annullato',
    completed: 'Completato',
    no_show: 'No Show',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Le mie prenotazioni</h1>
        <p className="text-sm text-slate-500 mt-1">I tuoi viaggi prenotati</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="Nessuna prenotazione"
          description="Esplora la mappa per trovare il tuo primo viaggio premium"
          action={
            <Link href="/map"><Button><Map className="h-4 w-4" /> Esplora la mappa</Button></Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link key={b.id} href={`/my-bookings/${b.id}`}>
              <Card hover className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <MapPin className="h-4 w-4 text-amber-500" />
                      {b.trip?.originCity || '\u2014'}
                      <ArrowRight className="h-3 w-3 text-slate-600" />
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      {b.trip?.destinationCity || '\u2014'}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {b.trip?.departureAt ? `${formatDate(b.trip.departureAt)} \u2014 ${formatTime(b.trip.departureAt)}` : '\u2014'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusColors[b.status] || 'default'}>
                      {statusLabels[b.status] || b.status}
                    </Badge>
                    <span className="text-sm font-semibold text-amber-500">
                      {formatCurrency(b.priceTotal)}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
