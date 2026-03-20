'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Mail, Lock, User, Phone, Building2, FileText, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'passenger' | 'operator'>('passenger');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // User fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  // Company fields (operator only)
  const [companyName, setCompanyName] = useState('');
  const [nccLicenseNumber, setNccLicenseNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body: Record<string, string> = {
        email,
        password,
        displayName,
        phone,
        userType,
      };

      if (userType === 'operator') {
        body.companyName = companyName;
        body.nccLicenseNumber = nccLicenseNumber;
        body.vatNumber = vatNumber;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Errore durante la registrazione');
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push('/login');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Errore di connessione');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="fixed inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-slate-950 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25">
              <span className="text-2xl font-black text-slate-950">R</span>
            </div>
            <span className="text-3xl font-bold tracking-tight text-white">
              Ride<span className="text-amber-500">Back</span>
            </span>
          </Link>
          <p className="mt-3 text-sm text-slate-500">Crea il tuo account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-8">
          {/* User type tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-800/50 mb-6">
            <button
              onClick={() => setUserType('passenger')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                userType === 'passenger'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <User className="h-4 w-4" />
              Passeggero
            </button>
            <button
              onClick={() => setUserType('operator')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                userType === 'operator'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Building2 className="h-4 w-4" />
              Operatore NCC
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Input
              label="Nome completo"
              placeholder="Mario Rossi"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              icon={<User className="h-4 w-4" />}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="la-tua@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              required
            />

            <Input
              label="Telefono"
              type="tel"
              placeholder="+39 333 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="h-4 w-4" />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Minimo 8 caratteri"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              required
            />

            {userType === 'operator' && (
              <>
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs text-amber-500 font-medium mb-3 uppercase tracking-wider">Dati Azienda NCC</p>
                </div>

                <Input
                  label="Nome azienda"
                  placeholder="NCC Premium Milano"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  icon={<Building2 className="h-4 w-4" />}
                  required
                />

                <Input
                  label="Numero licenza NCC"
                  placeholder="NCC-MI-12345"
                  value={nccLicenseNumber}
                  onChange={(e) => setNccLicenseNumber(e.target.value)}
                  icon={<FileText className="h-4 w-4" />}
                  required
                />

                <Input
                  label="Partita IVA"
                  placeholder="IT12345678901"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  icon={<FileText className="h-4 w-4" />}
                />
              </>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {userType === 'passenger' ? 'Registrati' : 'Registra Azienda'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Hai già un account?{' '}
              <Link href="/login" className="text-amber-500 hover:text-amber-400 font-medium">
                Accedi
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
