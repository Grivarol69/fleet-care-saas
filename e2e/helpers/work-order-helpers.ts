/**
 * work-order-helpers.ts
 *
 * Helpers compartidos para los tests de Work Orders.
 *
 * Funciones exportadas:
 * - fetchTestFixtures(request) → { vehicleId, serviceMantItemId, partMantItemId, partMantItemName }
 * - createBasicWO(request, vehicleId, items[]) → woId
 * - advanceWOToStatus(request, woId, targetStatus) → void
 * - DEFAULT_ITEMS: factory function que devuelve items default dado vehicleId y mantItemIds
 */
import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';

export interface TestFixtures {
  vehicleId: string;
  serviceMantItemId: string;
  partMantItemId: string;
  partMantItemName: string;
}

export type WOStatus =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'PENDING_INVOICE'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

/** Cadena de transiciones para llegar a cada estado desde PENDING */
const STATUS_CHAIN: Record<WOStatus, WOStatus[]> = {
  PENDING: [],
  PENDING_APPROVAL: ['PENDING_APPROVAL'],
  APPROVED: ['PENDING_APPROVAL', 'APPROVED'],
  IN_PROGRESS: ['PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS'],
  PENDING_INVOICE: [
    'PENDING_APPROVAL',
    'APPROVED',
    'IN_PROGRESS',
    'PENDING_INVOICE',
  ],
  COMPLETED: [
    'PENDING_APPROVAL',
    'APPROVED',
    'IN_PROGRESS',
    'PENDING_INVOICE',
    'COMPLETED',
  ],
  REJECTED: ['PENDING_APPROVAL', 'REJECTED'],
  CANCELLED: ['CANCELLED'],
};

/**
 * Obtiene fixtures necesarios para crear WOs:
 * - Un vehículo disponible
 * - Un MantItem de tipo SERVICE/ACTION
 * - Un MantItem de tipo PART
 */
export async function fetchTestFixtures(
  request: APIRequestContext
): Promise<TestFixtures> {
  // 1. Vehículo
  const vehiclesRes = await request.get('/api/vehicles/vehicles');
  expect(
    vehiclesRes.status(),
    'GET /api/vehicles/vehicles debe responder 200'
  ).toBe(200);
  const vehicles = await vehiclesRes.json();
  expect(
    vehicles.length,
    'Debe haber al menos un vehículo en staging'
  ).toBeGreaterThan(0);
  const vehicleId: string = vehicles[0].id;

  // 2. MantItems
  const mantItemsRes = await request.get('/api/maintenance/mant-items');
  expect(
    mantItemsRes.status(),
    'GET /api/maintenance/mant-items debe responder 200'
  ).toBe(200);
  const mantItemsRaw = await mantItemsRes.json();
  const allItems: any[] = Array.isArray(mantItemsRaw)
    ? mantItemsRaw
    : mantItemsRaw.items || [];

  const serviceItem = allItems.find(
    (i: any) => i.type === 'SERVICE' || i.type === 'ACTION'
  );
  const partItem = allItems.find((i: any) => i.type === 'PART');

  expect(
    serviceItem,
    'Debe existir al menos un MantItem SERVICE/ACTION'
  ).toBeTruthy();
  expect(partItem, 'Debe existir al menos un MantItem PART').toBeTruthy();

  return {
    vehicleId,
    serviceMantItemId: serviceItem.id,
    partMantItemId: partItem.id,
    partMantItemName: partItem.name ?? partItem.title ?? 'Repuesto',
  };
}

export interface WOItem {
  mantItemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  itemSource: 'INTERNAL_STOCK' | 'EXTERNAL';
  closureType: 'INTERNAL_TICKET' | 'PURCHASE_ORDER';
}

/**
 * Crea una WO básica via API y retorna su ID.
 * Si no se proveen items, se usan defaults genéricos con serviceMantItemId/partMantItemId.
 */
export async function createBasicWO(
  request: APIRequestContext,
  vehicleId: string,
  items: WOItem[]
): Promise<string> {
  const createRes = await request.post('/api/maintenance/work-orders', {
    data: {
      vehicleId,
      title: `OT E2E Helper - ${Date.now()}`,
      mantType: 'CORRECTIVE',
      priority: 'MEDIUM',
      items,
    },
  });
  expect(
    createRes.status(),
    `POST /api/maintenance/work-orders falló: ${await createRes.text()}`
  ).toBe(201);

  const wo = await createRes.json();
  return wo.id as string;
}

/**
 * Avanza una WO al estado objetivo encadenando las transiciones necesarias.
 * La WO debe estar en PENDING cuando se llama (recién creada).
 *
 * Ejemplo: advanceWOToStatus(request, woId, 'IN_PROGRESS') hará:
 *   PATCH PENDING_APPROVAL → PATCH APPROVED → PATCH IN_PROGRESS
 */
export async function advanceWOToStatus(
  request: APIRequestContext,
  woId: string,
  targetStatus: WOStatus
): Promise<void> {
  const chain = STATUS_CHAIN[targetStatus];
  if (!chain || chain.length === 0) return; // PENDING no necesita transiciones

  for (const status of chain) {
    const patchRes = await request.patch(
      `/api/maintenance/work-orders/${woId}`,
      { data: { status } }
    );
    expect(
      patchRes.status(),
      `PATCH status → ${status} falló para WO ${woId}: ${await patchRes.text()}`
    ).toBe(200);
  }
}

/**
 * Genera los items default para crear una WO:
 * 1 INTERNAL_STOCK service + 1 EXTERNAL part.
 */
export function buildDefaultItems(
  serviceMantItemId: string,
  partMantItemId: string
): WOItem[] {
  return [
    {
      mantItemId: serviceMantItemId,
      description: 'Servicio interno E2E',
      quantity: 1,
      unitPrice: 50000,
      itemSource: 'INTERNAL_STOCK',
      closureType: 'INTERNAL_TICKET',
    },
    {
      mantItemId: partMantItemId,
      description: 'Repuesto externo E2E',
      quantity: 1,
      unitPrice: 80000,
      itemSource: 'EXTERNAL',
      closureType: 'PURCHASE_ORDER',
    },
  ];
}
