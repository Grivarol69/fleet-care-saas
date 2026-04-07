'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SerialIntakeDialog } from '@/app/dashboard/assets/components/SerialIntakeDialog/SerialIntakeDialog';
import { CheckCircle2, Settings } from 'lucide-react';
import type { SerializedItemType } from '@prisma/client';

export interface PurchaseItemActionsProps {
  invoiceItemId: string;
  description: string;
  quantity: number;
  serializedType: SerializedItemType | null;
  registeredSerials: number;
}

export function PurchaseItemActions({
  invoiceItemId,
  description,
  quantity,
  serializedType,
  registeredSerials,
}: PurchaseItemActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!serializedType) return null;

  const isComplete = registeredSerials >= quantity;
  const remainingQuantity = quantity - registeredSerials;

  if (isComplete) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium justify-end">
        <CheckCircle2 className="h-4 w-4" />
        Completado
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-4 w-4" />
        Registrar Series ({registeredSerials}/{quantity})
      </Button>

      {open && (
        <SerialIntakeDialog
          invoiceItemId={invoiceItemId}
          invoiceItemDescription={description}
          quantity={remainingQuantity}
          type={serializedType}
          open={open}
          onOpenChange={setOpen}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
