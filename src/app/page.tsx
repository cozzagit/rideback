import Link from 'next/link';
import { TopBar } from '@/components/layout/top-bar';
import { LandingMapPreview } from '@/components/map/landing-map-preview';
import { Map, Shield, Car, Clock, ArrowRight, Sparkles, Route } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <TopBar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-slate-950" />
        <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Viaggia premium, risparmia smart
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Rientri NCC con
              <span className="block text-amber-500">posti disponibili</span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 max-w-lg">
              Gli autisti NCC rientrano alla base con l&apos;auto vuota. Tu viaggi su una Mercedes a prezzo smart. Win-win.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/map"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                <Map className="h-5 w-5" />
                Esplora la mappa
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
              >
                Registrati gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Come funziona</h2>
          <p className="text-slate-500 text-center mb-12 max-w-lg mx-auto">
            In tre semplici passi, dal rientro a vuoto al viaggio premium condiviso
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Car,
                title: "L'NCC pubblica il rientro",
                desc: "Dopo aver portato un cliente a destinazione, l'autista pubblica il viaggio di ritorno con i posti disponibili.",
              },
              {
                step: '02',
                icon: Map,
                title: 'Tu trovi il viaggio',
                desc: 'Esplora la mappa, scegli la tratta, il giorno e l\'orario. Prenota il tuo posto in pochi tap.',
              },
              {
                step: '03',
                icon: Route,
                title: 'Viaggi premium',
                desc: 'Auto di lusso, autista professionista, prezzo smart. Arrivi a destinazione con stile.',
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <span className="text-6xl font-black text-slate-800/50 absolute -top-4 right-4">{item.step}</span>
                <div className="relative p-6 rounded-2xl border border-slate-800 bg-slate-900/30">
                  <div className="p-3 rounded-xl bg-amber-500/10 w-fit mb-4">
                    <item.icon className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Perché RideBack?</h2>
              <div className="space-y-4">
                {[
                  { icon: Car, title: 'Auto premium', desc: 'Mercedes, BMW, Audi — solo flotte NCC professionali' },
                  { icon: Shield, title: 'Sicurezza garantita', desc: 'Autisti con licenza NCC, assicurati e verificati' },
                  { icon: Clock, title: 'Risparmio fino al 50%', desc: 'Rispetto a un servizio NCC dedicato, paghi molto meno' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="p-2.5 rounded-xl bg-slate-800 h-fit">
                      <item.icon className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden md:block">
              <LandingMapPreview />
            </div>
          </div>
        </div>
      </section>

      {/* CTA for NCC operators */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Sei un operatore NCC?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Smetti di rientrare a vuoto. Trasforma ogni ritorno in un&apos;opportunità di guadagno.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            Registra la tua azienda
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600">
              <span className="text-sm font-black text-slate-950">R</span>
            </div>
            <span className="text-sm font-semibold text-white">
              Ride<span className="text-amber-500">Back</span>
            </span>
          </div>
          <p className="text-xs text-slate-600">&copy; 2026 RideBack. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </div>
  );
}
