'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  Car,
  Route,
  BookOpen,
  BarChart3,
  Map,
  Settings,
  Shield,
} from 'lucide-react';

const operatorLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/company', icon: Building2, label: 'Azienda' },
  { href: '/drivers', icon: Users, label: 'Autisti' },
  { href: '/vehicles', icon: Car, label: 'Veicoli' },
  { href: '/trips', icon: Route, label: 'Viaggi' },
  { href: '/earnings', icon: BarChart3, label: 'Guadagni' },
];

const passengerLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/map', icon: Map, label: 'Cerca Viaggio' },
  { href: '/my-bookings', icon: BookOpen, label: 'Le Mie Prenotazioni' },
];

const adminLinks = [
  { href: '/admin', icon: Shield, label: 'Admin Panel' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userType = (session?.user as any)?.userType;

  const links = userType === 'operator' ? operatorLinks : passengerLinks;
  const showAdmin = userType === 'admin' || (session?.user as any)?.isSuperAdmin;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-slate-800 lg:bg-slate-950/50">
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}

        {showAdmin && (
          <>
            <div className="my-3 border-t border-slate-800" />
            {adminLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
        >
          <Settings className="h-5 w-5" />
          Impostazioni
        </Link>
      </div>
    </aside>
  );
}
