import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Construction } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
      <Construction className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-semibold">Página no encontrada</h2>
      <p className="text-muted-foreground max-w-md">
        Esta sección está en construcción o no existe.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Volver al Dashboard</Link>
      </Button>
    </div>
  );
}
