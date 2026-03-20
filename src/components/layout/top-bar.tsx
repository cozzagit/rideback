'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Bell, User, LogOut, LayoutDashboard, Map } from 'lucide-react';
import { useState } from 'react';

export function TopBar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
            <span className="text-lg font-black text-slate-950">R</span>
          </div>
          <span className="text-xl font-bold tracking-tight">
            Ride<span className="text-amber-500">Back</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/map" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
            <Map className="h-4 w-4" />
            Mappa
          </Link>
          {session && (
            <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Link href="/notifications" className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
                <Bell className="h-5 w-5" />
                {/* Notification dot */}
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500" />
              </Link>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center">
                    <User className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="hidden md:inline">{session.user?.name}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/20 animate-fade-in">
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-t-xl">
                      <User className="h-4 w-4" /> Profilo
                    </Link>
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <button onClick={() => signOut()} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800/50 rounded-b-xl">
                      <LogOut className="h-4 w-4" /> Esci
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">
                Accedi
              </Link>
              <Link href="/register" className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all">
                Registrati
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
