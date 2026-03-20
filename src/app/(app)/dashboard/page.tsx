'use client';

import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Route,
  Car,
  Users,
  BookOpen,
  Plus,
  Map,
  TrendingUp,
  Calendar,
  ArrowRight,
  BarChart3,
} from 'lucide-react';

function OperatorDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard Operatore</h1>
          <p className="text-sm text-slate-500 mt-1">Gestisci la tua flotta e i viaggi di ritorno</p>
        </div>
        <Link href="/trips/new">
          <Button size="lg">
            <Plus className="h-4 w-4" />
            Nuovo Viaggio
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Viaggi Attivi', value: '\u2014', icon: Route, color: 'text-amber-500' },
          { label: 'Veicoli', value: '\u2014', icon: Car, color: 'text-blue-500' },
          { label: 'Autisti', value: '\u2014', icon: Users, color: 'text-emerald-500' },
          { label: 'Prenotazioni', value: '\u2014', icon: BookOpen, color: 'text-violet-500' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-slate-800 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card hover className="p-5">
          <Link href="/trips/new" className="space-y-3">
            <div className="p-3 rounded-xl bg-amber-500/10 w-fit">
              <Plus className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Crea viaggio di ritorno</h3>
              <p className="text-xs text-slate-500 mt-1">Pubblica un rientro con posti disponibili</p>
            </div>
          </Link>
        </Card>

        <Card hover className="p-5">
          <Link href="/vehicles" className="space-y-3">
            <div className="p-3 rounded-xl bg-blue-500/10 w-fit">
              <Car className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Gestisci flotta</h3>
              <p className="text-xs text-slate-500 mt-1">Aggiungi e modifica veicoli e autisti</p>
            </div>
          </Link>
        </Card>

        <Card hover className="p-5">
          <Link href="/trips" className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 w-fit">
              <Calendar className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Calendario viaggi</h3>
              <p className="text-xs text-slate-500 mt-1">Visualizza e pianifica i prossimi rientri</p>
            </div>
          </Link>
        </Card>
      </div>
    </div>
  );
}

function PassengerDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">La tua dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Trova il tuo prossimo viaggio premium</p>
      </div>

      {/* CTA */}
      <Card className="p-6 md:p-8 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">Trova un viaggio</h2>
            <p className="text-sm text-slate-400">
              Esplora i rientri NCC disponibili sulla mappa e risparmia viaggiando premium.
            </p>
          </div>
          <Link href="/map">
            <Button size="lg">
              <Map className="h-4 w-4" />
              Esplora la mappa
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-amber-500">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">&mdash;</p>
              <p className="text-xs text-slate-500">Prenotazioni</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">&mdash;</p>
              <p className="text-xs text-slate-500">Risparmiato</p>
            </div>
          </div>
        </Card>
      </div>

      {/* My bookings preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Prossimi viaggi</h2>
          <Link href="/my-bookings" className="text-xs text-amber-500 hover:text-amber-400">
            Vedi tutti
          </Link>
        </div>
        <Card className="p-8">
          <div className="text-center">
            <Route className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Nessun viaggio prenotato</p>
            <Link href="/map">
              <Button variant="outline" size="sm" className="mt-3">
                Cerca un viaggio
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userType = session?.user?.userType;

  return userType === 'operator' ? <OperatorDashboard /> : <PassengerDashboard />;
}
