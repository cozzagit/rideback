'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewDriverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    licenseNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || 'Errore');
        setLoading(false);
        return;
      }

      router.push('/drivers');
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
        <Link href="/drivers" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuovo autista</h1>
          <p className="text-sm text-slate-500">Aggiungi un autista al team</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" placeholder="Marco" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
            <Input label="Cognome" placeholder="Rossi" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required />
          </div>
          <Input label="Telefono" type="tel" placeholder="+39 333 1234567" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          <Input label="Numero patente" placeholder="AB1234567C" value={form.licenseNumber} onChange={(e) => update('licenseNumber', e.target.value)} required />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            <Save className="h-4 w-4" /> Salva autista
          </Button>
        </form>
      </Card>
    </div>
  );
}
