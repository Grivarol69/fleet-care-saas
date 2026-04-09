import { Badge } from '@/components/ui/badge';
import { WorkOrderStatus } from '@prisma/client';
import { AlertTriangle, CheckCircle2, Clock, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkOrderStatusBadge({
  status,
  urgent = false,
}: {
  status: WorkOrderStatus;
  urgent?: boolean;
}) {
  let label: string = status;
  let colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
  let Icon = Clock;

  switch (status) {
    case 'PENDING':
      label = 'Planificando';
      colorClass = 'bg-slate-100 text-slate-700 border-slate-300';
      break;
    case 'PENDING_APPROVAL':
      label = 'Por Aprobar';
      colorClass = 'bg-amber-100 text-amber-800 border-amber-300';
      Icon = AlertTriangle;
      break;
    case 'IN_PROGRESS':
      label = 'En Progreso';
      colorClass =
        'bg-blue-100 text-blue-700 border-blue-300 shadow-sm shadow-blue-500/20';
      Icon = Wrench;
      break;
    case 'PENDING_INVOICE':
      label = 'Falta Factura';
      colorClass = 'bg-cyan-100 text-cyan-800 border-cyan-300';
      break;
    case 'COMPLETED':
      label = 'Terminado';
      colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      Icon = CheckCircle2;
      break;
    case 'CANCELLED':
    case 'REJECTED':
      label = status === 'CANCELLED' ? 'Cancelado' : 'Rechazado';
      colorClass = 'bg-red-100 text-red-800 border-red-300 opacity-80';
      Icon = AlertTriangle;
      break;
  }

  return (
    <div className="flex items-center gap-2">
      {urgent && (
        <div className="w-1 h-5 bg-red-500 rounded-full animate-pulse" />
      )}
      <Badge
        variant="outline"
        className={cn(
          'px-2.5 py-1 text-xs font-bold uppercase tracking-wider flex gap-1',
          colorClass
        )}
      >
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    </div>
  );
}
