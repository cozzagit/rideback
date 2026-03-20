'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { Plus, Users, Phone } from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/drivers')
      .then((res) => res.json())
      .then((data) => setDrivers(data.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Autisti</h1>
          <p className="text-sm text-slate-500 mt-1">Il team della tua flotta</p>
        </div>
        <Link href="/drivers/new">
          <Button><Plus className="h-4 w-4" /> Aggiungi autista</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : drivers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Nessun autista"
          description="Aggiungi il tuo primo autista"
          action={<Link href="/drivers/new"><Button><Plus className="h-4 w-4" /> Aggiungi autista</Button></Link>}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((d) => (
            <Card key={d.id} hover className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg font-bold text-white">
                  {d.firstName?.[0]}{d.lastName?.[0]}
                </div>
                <Badge variant={d.isActive ? 'success' : 'default'}>
                  {d.isActive ? 'Attivo' : 'Inattivo'}
                </Badge>
              </div>
              <h3 className="font-semibold text-white">{d.firstName} {d.lastName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Patente: {d.licenseNumber}</p>
              {d.phone && (
                <p className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                  <Phone className="h-3 w-3" /> {d.phone}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
