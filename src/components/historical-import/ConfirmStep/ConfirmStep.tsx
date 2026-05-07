'use client';

import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ConfirmStepProps } from './ConfirmStep.types';

export function ConfirmStep({ result, onRestart }: ConfirmStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-4xl font-bold text-green-600">{result.imported}</p>
        <p className="mt-1 text-lg text-muted-foreground">filas importadas</p>
      </div>

      {result.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>
            {result.errors.length}{' '}
            {result.errors.length === 1
              ? 'fila con error'
              : 'filas con errores'}
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1 text-sm">
              {result.errors.map(err => (
                <li key={`${err.row}-${err.kind}`}>
                  Fila {err.row}: {err.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onRestart}>
          Importar otro archivo
        </Button>
        <Button asChild>
          <Link href="/dashboard/maintenance">Ver en Mantenimiento</Link>
        </Button>
      </div>
    </div>
  );
}
