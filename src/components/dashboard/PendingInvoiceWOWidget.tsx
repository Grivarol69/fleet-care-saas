'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, AlertCircle } from 'lucide-react';
import axios from 'axios';

export function PendingInvoiceWOWidget() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await axios.get(
          '/api/maintenance/work-orders?status=PENDING_INVOICE'
        );
        const data = res.data as { workOrders?: unknown[] } | unknown[];
        // Handle both array response and { workOrders: [] } shape
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as { workOrders?: unknown[] }).workOrders)
            ? (data as { workOrders: unknown[] }).workOrders
            : [];
        setCount(list.length);
      } catch {
        setCount(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();
  }, []);

  const handleNavigate = () => {
    router.push('/dashboard/maintenance/work-orders?status=PENDING_INVOICE');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">OTs Por Cerrar</CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-16 animate-pulse bg-muted rounded" />
        ) : count === null ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertCircle className="h-4 w-4" />
            Sin datos
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-2xl font-bold text-orange-600">{count}</div>
            <p className="text-xs text-muted-foreground">
              {count === 1
                ? 'orden pendiente de facturación'
                : 'órdenes pendientes de facturación'}
            </p>
            {count > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigate}
                className="mt-2 w-full text-orange-700 border-orange-200 hover:bg-orange-50"
              >
                Ver OTs Por Cerrar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
