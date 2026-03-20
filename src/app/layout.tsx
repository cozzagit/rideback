import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RideBack — Viaggia Premium, Risparmia Smart',
  description:
    'Rientri NCC con posti disponibili. Trasporto premium a prezzi intelligenti.',
  openGraph: {
    title: 'RideBack — Viaggia Premium, Risparmia Smart',
    description:
      'Rientri NCC con posti disponibili. Trasporto premium a prezzi intelligenti.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="dark">
      <body
        className={`${inter.className} bg-slate-950 text-white antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
