'use client';

import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Profilo</h1>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center">
            <User className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user?.name}</h2>
            <Badge variant="premium">{user?.userType === 'operator' ? 'Operatore NCC' : 'Passeggero'}</Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-slate-500" />
            <span className="text-slate-300">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Shield className="h-4 w-4 text-slate-500" />
            <span className="text-slate-300 capitalize">{user?.userType}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
