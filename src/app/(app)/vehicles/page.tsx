'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { Plus, Car, Users, Palette } from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  licensePlate: string;
  seatsTotal: number;
  vehicleType: string;
  isActive: boolean;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vehicles')
      .then((res) => res.json())
      .then((data) => setVehicles(data.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Veicoli</h1>
          <p className="text-sm text-slate-500 mt-1">Gestisci la tua flotta</p>
        </div>
        <Link href="/vehicles/new">
          <Button>
            <Plus className="h-4 w-4" />
            Aggiungi veicolo
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={<Car className="h-12 w-12" />}
          title="Nessun veicolo"
          description="Aggiungi il tuo primo veicolo per iniziare a pubblicare viaggi"
          action={
            <Link href="/vehicles/new">
              <Button><Plus className="h-4 w-4" /> Aggiungi veicolo</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Card key={v.id} hover className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-slate-800">
                  <Car className="h-6 w-6 text-amber-500" />
                </div>
                <Badge variant={v.isActive ? 'success' : 'default'}>
                  {v.isActive ? 'Attivo' : 'Inattivo'}
                </Badge>
              </div>
              <h3 className="font-semibold text-white">{v.make} {v.model}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{v.licensePlate}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {v.seatsTotal} posti
                </span>
                {v.color && (
                  <span className="flex items-center gap-1">
                    <Palette className="h-3 w-3" /> {v.color}
                  </span>
                )}
                {v.year && <span>{v.year}</span>}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800">
                <Badge variant="info">{v.vehicleType}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
