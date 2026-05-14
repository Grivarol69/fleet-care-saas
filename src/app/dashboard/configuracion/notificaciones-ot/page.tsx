import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/lib/auth';
import { WONotificationConfig } from '@/components/settings/WONotificationConfig';

export default async function NotificacionesOTPage() {
  const { user } = await requireCurrentUser();

  if (!user || !['OWNER', 'MANAGER'].includes(user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-2">
        Notificaciones WhatsApp — Órdenes de Trabajo
      </h1>
      <p className="text-muted-foreground mb-6">
        Configurá qué usuarios reciben notificaciones WhatsApp en cada etapa del
        ciclo de vida de las OTs.
      </p>
      <WONotificationConfig />
    </div>
  );
}
