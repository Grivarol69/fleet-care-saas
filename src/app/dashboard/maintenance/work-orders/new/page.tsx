import { UnifiedWorkOrderForm } from '@/components/maintenance/work-orders/UnifiedWorkOrderForm';

export default function NewWorkOrderPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">
        Nueva Orden de Trabajo (Unificada)
      </h1>
      <UnifiedWorkOrderForm />
    </div>
  );
}
