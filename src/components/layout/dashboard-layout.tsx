import { TopBar } from './top-bar';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <TopBar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-4 py-6 md:px-8 pb-24 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
