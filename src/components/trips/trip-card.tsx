import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatTime, formatDuration } from '@/lib/utils';
import { Clock, Users, ArrowRight, Car } from 'lucide-react';
import Link from 'next/link';

interface TripCardProps {
  trip: {
    id: string;
    originCity: string;
    destinationCity: string;
    departureAt: string;
    estimatedArrivalAt: string;
    seatsAvailable: number;
    pricePerSeat: number;
    companyName: string;
    vehicle: string;
  };
  compact?: boolean;
  routeColor?: string;
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function TripCard({ trip, compact = false, routeColor, isHovered, onMouseEnter, onMouseLeave }: TripCardProps) {
  const duration = Math.round(
    (new Date(trip.estimatedArrivalAt).getTime() - new Date(trip.departureAt).getTime()) / 60000
  );
  const seatsLeft = trip.seatsAvailable;

  return (
    <Card
      hover
      className={`${compact ? 'p-3' : 'p-4'} transition-all duration-200 ${
        isHovered
          ? 'ring-1 ring-amber-500/50 bg-slate-800/80 scale-[1.02] shadow-lg shadow-amber-500/10'
          : ''
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Route */}
      <div className="flex items-center gap-2 mb-3">
        {routeColor && (
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-slate-900"
            style={{ backgroundColor: routeColor }}
          />
        )}
        <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
          {trip.originCity}
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
        <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
          {trip.destinationCity}
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-3">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatTime(trip.departureAt)} &middot; {formatDuration(duration)}
        </span>
        <span className="flex items-center gap-1">
          <Car className="h-3.5 w-3.5" />
          {trip.vehicle}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {seatsLeft} {seatsLeft === 1 ? 'posto' : 'posti'}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-amber-500">{formatCurrency(trip.pricePerSeat)}</span>
          <span className="text-xs text-slate-500 ml-1">/ posto</span>
        </div>
        {!compact && (
          <Link href={`/trips/${trip.id}`}>
            <Button size="sm">Prenota</Button>
          </Link>
        )}
      </div>

      {/* Company */}
      <div className="mt-2 pt-2 border-t border-slate-800">
        <span className="text-xs text-slate-500">{trip.companyName}</span>
      </div>
    </Card>
  );
}
