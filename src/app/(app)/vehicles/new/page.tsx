'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    licensePlate: '',
    seatsTotal: '4',
    vehicleType: 'sedan',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: form.year ? parseInt(form.year) : null,
          seatsTotal: parseInt(form.seatsTotal),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || 'Errore');
        setLoading(false);
        return;
      }

      router.push('/vehicles');
      router.refresh();
    } catch {
      setError('Errore di connessione');
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vehicles" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuovo veicolo</h1>
          <p className="text-sm text-slate-500">Aggiungi un veicolo alla tua flotta</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Marca" placeholder="Mercedes" value={form.make} onChange={(e) => update('make', e.target.value)} required />
            <Input label="Modello" placeholder="Classe E" value={form.model} onChange={(e) => update('model', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Anno" type="number" placeholder="2024" value={form.year} onChange={(e) => update('year', e.target.value)} />
            <Input label="Colore" placeholder="Nero" value={form.color} onChange={(e) => update('color', e.target.value)} />
          </div>

          <Input label="Targa" placeholder="AA 123 BB" value={form.licensePlate} onChange={(e) => update('licensePlate', e.target.value)} required />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Posti passeggeri" type="number" min="1" max="8" value={form.seatsTotal} onChange={(e) => update('seatsTotal', e.target.value)} required />
            <Select
              label="Tipo veicolo"
              value={form.vehicleType}
              onChange={(e) => update('vehicleType', e.target.value)}
              options={[
                { value: 'sedan', label: 'Berlina' },
                { value: 'van', label: 'Van' },
                { value: 'minibus', label: 'Minibus' },
              ]}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" loading={loading}>
              <Save className="h-4 w-4" />
              Salva veicolo
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
