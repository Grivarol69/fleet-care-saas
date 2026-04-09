/**
 * OT — Lifecycle completo (OWNER)
 *
 * Cubre el ciclo completo: PENDING → PENDING_APPROVAL → APPROVED → IN_PROGRESS
 *                          → PENDING_INVOICE → COMPLETED
 *
 * Corre en el proyecto `as-owner` (playwright.config.ts) gracias al glob *.owner.spec.ts.
 *
 * Notas de implementación:
 * - La WO se crea via API con items (min 1 requerido por el schema actual).
 * - Transiciones via UI: botones directos en WorkOrderHeader (FSM correcto).
 * - PENDING            → "Enviar a Aprobación"
 * - PENDING_APPROVAL   → "Aprobar OT" → Dialog → "Confirmar Aprobación"
 * - PENDING_APPROVAL   → "Rechazar"   → Dialog → "Confirmar Rechazo" (test separado)
 * - APPROVED           → "Iniciar Trabajo"
 * - IN_PROGRESS        → "Cerrar OT" → Dialog "Cerrar Orden de Trabajo" → "Confirmar cierre"
 * - PENDING_INVOICE    → "Marcar como Completada"
 *
 * Bug fix cubierto: APPROVED estaba ausente del array del stepper — se agrega test explícito.
 */
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('OT — Lifecycle completo (OWNER)', () => {
  let woId: string;
  let vehicleId: string;
  let serviceMantItemId: string;
  let partMantItemId: string;
  let hasTechnician = false;

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
    vehicleId = vehicles[0].id;

    // 2. Obtener mantItems (un SERVICE/ACTION + un PART)
    const mantItemsRes = await request.get('/api/maintenance/mant-items');
    expect(
      mantItemsRes.status(),
      'GET /api/maintenance/mant-items debe responder 200'
    ).toBe(200);
    const mantItemsRaw = await mantItemsRes.json();
    const allItems = Array.isArray(mantItemsRaw)
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

    serviceMantItemId = serviceItem.id;
    partMantItemId = partItem.id;

    // 3. Intentar obtener un técnico (para test de Ticket de Taller, opcional)
    try {
      const techRes = await request.get('/api/people/technicians');
      if (techRes.status() === 200) {
        const technicians = await techRes.json();
        if (Array.isArray(technicians) && technicians.length > 0) {
          hasTechnician = true;
          console.log(`Técnico disponible: ${technicians[0].id}`);
        }
      }
    } catch {
      console.log(
        'No se pudo obtener técnicos — test de Ticket de Taller se saltará'
      );
    }

    // 4. Crear WO via API con items requeridos (1 INTERNAL_STOCK service + 1 EXTERNAL part)
    const createRes = await request.post('/api/maintenance/work-orders', {
      data: {
        vehicleId,
        title: `OT E2E Lifecycle - ${Date.now()}`,
        mantType: 'CORRECTIVE',
        priority: 'MEDIUM',
        items: [
          {
            mantItemId: serviceMantItemId,
            description: 'Servicio interno E2E lifecycle',
            quantity: 1,
            unitPrice: 50000,
            itemSource: 'INTERNAL_STOCK',
            closureType: 'INTERNAL_TICKET',
          },
          {
            mantItemId: partMantItemId,
            description: 'Repuesto externo E2E lifecycle',
            quantity: 1,
            unitPrice: 80000,
            itemSource: 'EXTERNAL',
            closureType: 'PURCHASE_ORDER',
          },
        ],
      },
    });
    expect(
      createRes.status(),
      `POST /api/maintenance/work-orders falló: ${await createRes.text()}`
    ).toBe(201);

    const wo = await createRes.json();
    woId = wo.id;
    console.log(`WO creada via API: ${woId}`);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 1: La OT recién creada tiene estado "Abierta" (PENDING)
  // ─────────────────────────────────────────────────────────────────────────────
  test('1. WO creada con estado Abierta (PENDING)', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await expect(page.getByText('Abierta').first()).toBeVisible({
      timeout: 10000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 2: PENDING → PENDING_APPROVAL via "Enviar a Aprobación"
  // ─────────────────────────────────────────────────────────────────────────────
  test('2. Enviar a Aprobación → En Aprobación', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    const enviarBtn = page.getByRole('button', { name: 'Enviar a Aprobación' });
    await expect(enviarBtn).toBeVisible({ timeout: 10000 });
    await enviarBtn.click();

    await expect(page.getByText('En Aprobación').first()).toBeVisible({
      timeout: 15000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 3: PENDING_APPROVAL → APPROVED via "Aprobar OT" → dialog → "Confirmar Aprobación"
  // También verifica toast de OC generada (EXTERNAL item presente)
  // ─────────────────────────────────────────────────────────────────────────────
  test('3. Aprobar OT → Aprobada (APPROVED) + toast OC generadas', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    const aprobarBtn = page.getByRole('button', { name: 'Aprobar OT' });
    await expect(aprobarBtn).toBeVisible({ timeout: 10000 });
    await aprobarBtn.click();

    // Dialog de confirmación de aprobación
    const confirmarBtn = page.getByRole('button', {
      name: 'Confirmar Aprobación',
    });
    await expect(confirmarBtn).toBeVisible({ timeout: 5000 });
    await confirmarBtn.click();

    // Badge de estado debe cambiar a "Aprobada"
    await expect(page.getByText('Aprobada').first()).toBeVisible({
      timeout: 15000,
    });

    // Toast de OC generadas (puede decir "0 OC generadas" o "N OC generadas")
    await expect(page.getByText(/OC generadas/i)).toBeVisible({
      timeout: 10000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 4: Stepper muestra "Aprobada" como paso activo cuando status === APPROVED
  // (Regresión: APPROVED estaba ausente del array del stepper y el paso no se marcaba activo)
  // ─────────────────────────────────────────────────────────────────────────────
  test('4. Stepper muestra "Aprobada" como paso activo (bug fix regresión)', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // El paso "Aprobada" debe estar marcado como activo (clase text-primary)
    // Los pasos completados usan text-foreground, los pendientes usan text-muted-foreground
    const aprobadaActiveStep = page.locator('span.text-primary').filter({
      hasText: 'Aprobada',
    });
    await expect(aprobadaActiveStep).toBeVisible({ timeout: 10000 });

    // Los pasos anteriores ("Planificación", "Esperando Aprobación") deben ser completed
    // Los pasos posteriores deben ser pending (text-muted-foreground)
    const pendingStep = page.locator('span.text-muted-foreground').filter({
      hasText: 'En Progreso',
    });
    await expect(pendingStep).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 5: APPROVED → IN_PROGRESS via "Iniciar Trabajo"
  // ─────────────────────────────────────────────────────────────────────────────
  test('5. Iniciar Trabajo → En Trabajo (IN_PROGRESS)', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    const iniciarBtn = page.getByRole('button', { name: 'Iniciar Trabajo' });
    await expect(iniciarBtn).toBeVisible({ timeout: 10000 });
    await iniciarBtn.click();

    await expect(page.getByText('En Trabajo').first()).toBeVisible({
      timeout: 15000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 6: Botón "Ticket de Taller" visible en IN_PROGRESS cuando hay INTERNAL_STOCK items
  // ─────────────────────────────────────────────────────────────────────────────
  test('6. Ticket de Taller visible en IN_PROGRESS (con items INTERNAL_STOCK)', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // El botón debe ser visible porque el servicio tiene itemSource INTERNAL_STOCK
    // y el estado es IN_PROGRESS
    const ticketBtn = page.getByRole('button', { name: 'Ticket de Taller' });
    await expect(ticketBtn).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 7: IN_PROGRESS → PENDING_INVOICE via "Cerrar OT" → dialog → "Confirmar cierre"
  // ─────────────────────────────────────────────────────────────────────────────
  test('7. Cerrar OT → Por Cerrar (PENDING_INVOICE)', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    const cerrarBtn = page.getByRole('button', { name: 'Cerrar OT' });
    await expect(cerrarBtn).toBeVisible({ timeout: 10000 });
    await cerrarBtn.click();

    // Dialog titulado "Cerrar Orden de Trabajo"
    await expect(
      page.getByRole('dialog', { name: /cerrar orden de trabajo/i })
    ).toBeVisible({ timeout: 5000 });

    // Confirmar cierre (km es opcional)
    const confirmarBtn = page.getByRole('button', { name: 'Confirmar cierre' });
    await expect(confirmarBtn).toBeVisible({ timeout: 3000 });
    await confirmarBtn.click();

    await expect(page.getByText('Por Cerrar').first()).toBeVisible({
      timeout: 15000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 8: PENDING_INVOICE → COMPLETED via "Marcar como Completada"
  // También verifica que el tab "Órdenes de Compra" carga sin error post-completado
  // ─────────────────────────────────────────────────────────────────────────────
  test('8. Marcar como Completada → Cerrada + tab Órdenes de Compra sin error', async ({
    page,
  }) => {
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

    // Verificar que el tab "Órdenes de Compra" carga sin error 403 ni texto de error
    await page.getByRole('tab', { name: 'Órdenes de Compra' }).click();
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await expect(page.getByText('403')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Unauthorized')).not.toBeVisible({
      timeout: 3000,
    });
    await expect(page.getByText('Error al cargar')).not.toBeVisible({
      timeout: 3000,
    });
  });
});
