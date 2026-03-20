'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save, MapPin, Navigation } from 'lucide-react';
import Link from 'next/link';

interface GeoResult {
  id: string;
  placeName: string;
  center: [number, number];
  text: string;
}

export default function NewTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Origin/Destination geocoding
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [originResults, setOriginResults] = useState<GeoResult[]>([]);
  const [destResults, setDestResults] = useState<GeoResult[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<GeoResult | null>(null);
  const [selectedDest, setSelectedDest] = useState<GeoResult | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);

  // Route info
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);

  // Form fields
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [seatsAvailable, setSeatsAvailable] = useState('3');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/vehicles').then((r) => r.json()),
      fetch('/api/drivers').then((r) => r.json()),
    ]).then(([v, d]) => {
      setVehicles(v.data || []);
      setDrivers(d.data || []);
    });
  }, []);

  const geocode = async (query: string): Promise<GeoResult[]> => {
    if (query.length < 3) return [];
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    return json.data || [];
  };

  const handleOriginChange = async (value: string) => {
    setOriginQuery(value);
    setSelectedOrigin(null);
    if (value.length >= 3) {
      setOriginResults(await geocode(value));
      setActiveField('origin');
    } else {
      setOriginResults([]);
    }
  };

  const handleDestChange = async (value: string) => {
    setDestQuery(value);
    setSelectedDest(null);
    if (value.length >= 3) {
      setDestResults(await geocode(value));
      setActiveField('destination');
    } else {
      setDestResults([]);
    }
  };

  const fetchRoute = async (origin: GeoResult, dest: GeoResult) => {
    const res = await fetch(`/api/directions?origin=${origin.center[0]},${origin.center[1]}&destination=${dest.center[0]},${dest.center[1]}`);
    const json = await res.json();
    if (json.data) {
      setRouteInfo({ distance: json.data.distance, duration: json.data.duration });
    }
  };

  const selectOrigin = async (result: GeoResult) => {
    setSelectedOrigin(result);
    setOriginQuery(result.text);
    setOriginResults([]);
    setActiveField(null);
    if (selectedDest) await fetchRoute(result, selectedDest);
  };

  const selectDest = async (result: GeoResult) => {
    setSelectedDest(result);
    setDestQuery(result.text);
    setDestResults([]);
    setActiveField(null);
    if (selectedOrigin) await fetchRoute(selectedOrigin, result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrigin || !selectedDest) {
      setError('Seleziona partenza e destinazione');
      return;
    }
    if (!vehicleId) {
      setError('Seleziona un veicolo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const departureAt = new Date(`${departureDate}T${departureTime}`).toISOString();
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          driverId: driverId || undefined,
          originAddress: selectedOrigin.placeName,
          originLat: selectedOrigin.center[1],
          originLng: selectedOrigin.center[0],
          originCity: selectedOrigin.text,
          destinationAddress: selectedDest.placeName,
          destinationLat: selectedDest.center[1],
          destinationLng: selectedDest.center[0],
          destinationCity: selectedDest.text,
          departureAt,
          seatsAvailable: parseInt(seatsAvailable),
          pricePerSeat: Math.round(parseFloat(pricePerSeat) * 100),
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || 'Errore nella creazione');
        setLoading(false);
        return;
      }

      router.push('/trips');
      router.refresh();
    } catch {
      setError('Errore di connessione');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/trips" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuovo viaggio di ritorno</h1>
          <p className="text-sm text-slate-500">Pubblica un rientro con posti disponibili</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Origin & Destination */}
          <div className="space-y-3">
            <p className="text-xs text-amber-500 font-medium uppercase tracking-wider">Percorso</p>

            {/* Origin */}
            <div className="relative">
              <Input
                label="Punto di partenza (rientro)"
                placeholder="Es. Milano, Hotel Principe di Savoia"
                value={originQuery}
                onChange={(e) => handleOriginChange(e.target.value)}
                icon={<div className="h-2.5 w-2.5 rounded-full bg-amber-500" />}
              />
              {activeField === 'origin' && originResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-20 max-h-48 overflow-y-auto">
                  {originResults.map((r) => (
                    <button key={r.id} onClick={() => selectOrigin(r)} type="button"
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 text-left">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{r.placeName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Destination */}
            <div className="relative">
              <Input
                label="Destinazione (base/rimessa)"
                placeholder="Es. Roma, Via Appia 123"
                value={destQuery}
                onChange={(e) => handleDestChange(e.target.value)}
                icon={<div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
              />
              {activeField === 'destination' && destResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-20 max-h-48 overflow-y-auto">
                  {destResults.map((r) => (
                    <button key={r.id} onClick={() => selectDest(r)} type="button"
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 text-left">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{r.placeName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Route info */}
            {routeInfo && (
              <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <Navigation className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-slate-300">
                  {Math.round(routeInfo.distance)} km &middot; ~{Math.floor(routeInfo.duration / 60)}h {routeInfo.duration % 60}min
                </span>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <p className="text-xs text-amber-500 font-medium uppercase tracking-wider">Quando</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Data" type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} required />
              <Input label="Ora partenza" type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required />
            </div>
          </div>

          {/* Vehicle & Driver */}
          <div className="space-y-3">
            <p className="text-xs text-amber-500 font-medium uppercase tracking-wider">Veicolo e autista</p>
            <Select
              label="Veicolo"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              placeholder="Seleziona veicolo"
              options={vehicles.map((v) => ({ value: v.id, label: `${v.make} ${v.model} — ${v.licensePlate}` }))}
            />
            <Select
              label="Autista (opzionale)"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              placeholder="Seleziona autista"
              options={drivers.map((d) => ({ value: d.id, label: `${d.firstName} ${d.lastName}` }))}
            />
          </div>

          {/* Pricing */}
          <div className="space-y-3">
            <p className="text-xs text-amber-500 font-medium uppercase tracking-wider">Posti e prezzo</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Posti disponibili" type="number" min="1" max="8" value={seatsAvailable} onChange={(e) => setSeatsAvailable(e.target.value)} required />
              <Input label="Prezzo per posto (EUR)" type="number" min="10" step="0.01" placeholder="85.00" value={pricePerSeat} onChange={(e) => setPricePerSeat(e.target.value)} required />
            </div>
          </div>

          {/* Notes */}
          <Textarea label="Note (opzionale)" placeholder="Es. Partenza da hotel, disponibile a fermate intermedie..." value={notes} onChange={(e) => setNotes(e.target.value)} />

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            <Save className="h-4 w-4" />
            Pubblica viaggio
          </Button>
        </form>
      </Card>
    </div>
  );
}
