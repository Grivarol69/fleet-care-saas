import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Construction } from 'lucide-react';

export function UnderConstruction({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
      <Construction className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground max-w-md">
        Esta sección está en desarrollo. Pronto estará disponible.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Volver al Dashboard</Link>
      </Button>
    </div>
  );
}
