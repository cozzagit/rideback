'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Map, LayoutDashboard, Route, BookOpen, User } from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const userType = (session?.user as any)?.userType;

  const links = userType === 'operator'
    ? [
        { href: '/map', icon: Map, label: 'Mappa' },
        { href: '/trips', icon: Route, label: 'Viaggi' },
        { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
        { href: '/vehicles', icon: Route, label: 'Flotta' },
        { href: '/profile', icon: User, label: 'Profilo' },
      ]
    : [
        { href: '/map', icon: Map, label: 'Mappa' },
        { href: '/my-bookings', icon: BookOpen, label: 'Prenotazioni' },
        { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
        { href: '/profile', icon: User, label: 'Profilo' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/90 backdrop-blur-xl lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs transition-colors',
                isActive ? 'text-amber-500' : 'text-slate-500'
              )}
            >
              <link.icon className={cn('h-5 w-5', isActive && 'drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]')} />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
