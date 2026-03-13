'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TallerCard } from './components/TallerCard';
import { TallerDetailPanel } from './components/TallerDetailPanel';
import { Loader2, Hammer, ArrowLeft, Wrench } from 'lucide-react';
import Link from 'next/link';
import { canAccessTaller } from '@/lib/permissions';
import { Badge } from '@/components/ui/badge';

type CurrentUser = {
  id: string;
  role: string;
  isSuperAdmin: boolean;
};

export default function TallerPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(
    null
  );

  const fetchUserAndData = useCallback(async () => {
    try {
      setIsLoading(true);
      // 1. Obtener usuario
      const userRes = await axios.get('/api/auth/me');
      const user = userRes.data;
      setCurrentUser(user);

      // 2. Verificar acceso
      if (!canAccessTaller(user as any)) return;

      // 3. Construir URL según rol
      let url =
        '/api/maintenance/work-orders?hasInternalWork=true&status=IN_PROGRESS,PENDING,APPROVED';
      if (user.role === 'TECHNICIAN') {
        url += '&assignedToMe=true';
      }

      const woRes = await axios.get(url);
      setWorkOrders(woRes.data || []);
    } catch (error) {
      console.error('Error fetching taller data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserAndData();
  }, [fetchUserAndData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">
          Preparando taller...
        </p>
      </div>
    );
  }

  if (currentUser && !canAccessTaller(currentUser as any)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="p-4 bg-destructive/10 rounded-full">
          <Wrench className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Sin Acceso al Taller</h1>
          <p className="text-muted-foreground max-w-md">
            No tienes los permisos necesarios para acceder a este panel.
            Contacta con un administrador si crees que esto es un error.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Hammer className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-4xl font-black tracking-tight uppercase">
              Mi Taller
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Órdenes de trabajo con tareas internas pendientes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="px-3 py-1 font-mono uppercase bg-muted/50"
          >
            {workOrders.length}{' '}
            {workOrders.length === 1 ? 'Trabajo Activo' : 'Trabajos Activos'}
          </Badge>
        </div>
      </header>

      {workOrders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 bg-muted/30 border-dashed border-2">
          <Wrench className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-xl font-bold text-muted-foreground">
            No tenés trabajo de taller pendiente
          </p>
          <p className="text-muted-foreground mb-8">
            Vuelve más tarde o consulta la cartelera general.
          </p>
          <Button asChild>
            <Link href="/dashboard/maintenance/work-orders">
              Ver todas las OTs
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workOrders.map(wo => (
            <TallerCard
              key={wo.id}
              workOrder={wo}
              isSelected={selectedWorkOrderId === wo.id}
              onClick={() => setSelectedWorkOrderId(wo.id)}
            />
          ))}
        </div>
      )}

      {selectedWorkOrderId && currentUser && (
        <TallerDetailPanel
          workOrderId={selectedWorkOrderId}
          currentUser={currentUser}
          onClose={() => setSelectedWorkOrderId(null)}
        />
      )}
    </div>
  );
}
