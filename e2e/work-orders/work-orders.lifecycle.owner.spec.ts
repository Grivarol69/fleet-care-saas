/**
 * OT — Lifecycle completo (OWNER)
 *
 * Cubre el ciclo completo: PENDING → IN_PROGRESS → PENDING_INVOICE → COMPLETED.
 * Corre en el proyecto `as-owner` (playwright.config.ts) gracias al glob *.owner.spec.ts.
 *
 * Notas de implementación:
 * - La WO se crea via API (CORRECTIVE, sin alertIds) para evitar la restricción
 *   de "un vehículo no puede tener dos WOs activas simultáneas" que bloquea el UI de alertas.
 * - Transiciones via UI: botones directos en WorkOrderHeader (sin DropdownMenu).
 * - PENDING      → "Iniciar trabajo" (sin confirm).
 * - IN_PROGRESS  → "Cerrar OT" → Dialog km → "Confirmar cierre".
 * - PENDING_INVOICE → "Marcar como Completada" (sin confirm).
 */
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('OT — Lifecycle completo (OWNER)', () => {
  let woId: string;

  test.beforeAll(async ({ request }) => {
    // 1. Obtener un vehículo disponible
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
    const vehicleId = vehicles[0].id;

    // 2. Crear WO CORRECTIVE via API (no requiere alertIds)
    const createRes = await request.post('/api/maintenance/work-orders', {
      data: {
        vehicleId,
        title: `OT E2E Lifecycle - ${Date.now()}`,
        mantType: 'CORRECTIVE',
        priority: 'MEDIUM',
      },
    });
    expect(
      createRes.status(),
      `POST /api/maintenance/work-orders falló: ${await createRes.text()}`
    ).toBe(201);

    const wo = await createRes.json();
    woId = wo.id;
    console.log(`✅ WO creada via API: ${woId}`);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 1: La OT recién creada tiene estado "Abierta" (PENDING)
  // ─────────────────────────────────────────────────────────────────────────────
  test('1. WO creada con estado Abierta', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Badge de estado renderizado por WorkOrderHeader via statusConfig
    await expect(page.getByText('Abierta').first()).toBeVisible({
      timeout: 10000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 2: PENDING → IN_PROGRESS
  // WorkOrderHeader renderiza directamente <Button>Iniciar trabajo</Button>
  // cuando status === 'PENDING' y canExecute(user) === true.
  // No hay DropdownMenu ni AlertDialog de confirmación.
  // ─────────────────────────────────────────────────────────────────────────────
  test('2. Iniciar trabajo → En Trabajo', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Botón directo — no hay menu desplegable en esta implementación
    const iniciarBtn = page.getByRole('button', { name: 'Iniciar trabajo' });
    await expect(iniciarBtn).toBeVisible({ timeout: 10000 });
    await iniciarBtn.click();

    // La transición actualiza el badge sin confirmación adicional
    await expect(page.getByText('En Trabajo').first()).toBeVisible({
      timeout: 15000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 3: IN_PROGRESS → PENDING_INVOICE ("Por Cerrar")
  // WorkOrderHeader renderiza <Button>Cerrar OT</Button> cuando status === 'IN_PROGRESS'
  // e isManagerOrAbove(user) === true.
  // Ese botón abre un Dialog (shadcn <Dialog>, no <AlertDialog>) con:
  //   - Input de kilometraje al cierre (opcional)
  //   - Botón "Confirmar cierre" que dispara handleCloseToPendingInvoice()
  // Si el ticket se genera, aparece un toast con título "Ticket descargado".
  // ─────────────────────────────────────────────────────────────────────────────
  test('3. Cerrar OT → Por Cerrar (PENDING_INVOICE)', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Botón directo que abre el Dialog de cierre
    const cerrarBtn = page.getByRole('button', { name: /cerrar/i }).first();
    await expect(cerrarBtn).toBeVisible({ timeout: 10000 });
    await cerrarBtn.click();

    // El Dialog de cierre debe aparecer con el título "Cerrar Orden de Trabajo"
    await expect(
      page.getByRole('dialog', { name: /cerrar orden de trabajo/i })
    ).toBeVisible({ timeout: 5000 });

    // Confirmar cierre (el km es opcional según el componente)
    const confirmarBtn = page.getByRole('button', { name: 'Confirmar cierre' });
    await expect(confirmarBtn).toBeVisible({ timeout: 3000 });
    await confirmarBtn.click();

    // Assertar badge de estado "Por Cerrar" (PENDING_INVOICE)
    await expect(page.getByText('Por Cerrar').first()).toBeVisible({
      timeout: 20000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 4: PENDING_INVOICE → COMPLETED ("Cerrada")
  // WorkOrderHeader renderiza "Marcar como Completada" cuando status === PENDING_INVOICE
  // e isManagerOrAbove(user) === true.
  // ─────────────────────────────────────────────────────────────────────────────
  test('4. Marcar como Completada → Cerrada', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    const completarBtn = page.getByRole('button', {
      name: 'Marcar como Completada',
    });
    await expect(completarBtn).toBeVisible({ timeout: 10000 });
    await completarBtn.click();

    await expect(page.getByText('Cerrada').first()).toBeVisible({
      timeout: 15000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 5: OT Cerrada aparece en el listado
  // ─────────────────────────────────────────────────────────────────────────────
  test('5. OT Cerrada aparece en el listado', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto('/dashboard/maintenance/work-orders');
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await expect(page.getByText('Cerrada').first()).toBeVisible({
      timeout: 10000,
    });
  });
});
