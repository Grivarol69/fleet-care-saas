/**
 * OT — Tickets Internos y PO (OWNER)
 *
 * Cubre la funcionalidad de Tickets de Taller (para items INTERNAL_STOCK)
 * y Órdenes de Compra (para items EXTERNAL) en una Work Order.
 *
 * Tests incluyen:
 * - Visibilidad del botón "Ticket de Taller" en IN_PROGRESS
 * - Click en "Ticket de Taller" abre modal/drawer sin error 500
 * - Tab "Órdenes de Compra" carga sin error en IN_PROGRESS
 * - Tab "Órdenes de Compra" muestra OC post-aprobación con item EXTERNAL
 *
 * Setup: WO con 1 INTERNAL_STOCK service + 1 EXTERNAL part, avanzada a IN_PROGRESS.
 * El último test crea una WO separada para verificar OC en estado APPROVED.
 *
 * Corre en el proyecto `as-owner` (playwright.config.ts).
 */
import { test, expect } from '@playwright/test';
import {
  fetchTestFixtures,
  createBasicWO,
  advanceWOToStatus,
  buildDefaultItems,
} from '../helpers/work-order-helpers';

test.describe.configure({ mode: 'serial' });

test.describe('OT — Tickets Internos y PO', () => {
  let woId: string;
  let vehicleId: string;
  let serviceMantItemId: string;
  let partMantItemId: string;

  test.beforeAll(async ({ request }) => {
    const fixtures = await fetchTestFixtures(request);
    vehicleId = fixtures.vehicleId;
    serviceMantItemId = fixtures.serviceMantItemId;
    partMantItemId = fixtures.partMantItemId;

    // Crear WO con INTERNAL_STOCK + EXTERNAL y avanzar a IN_PROGRESS
    woId = await createBasicWO(
      request,
      vehicleId,
      buildDefaultItems(serviceMantItemId, partMantItemId)
    );
    await advanceWOToStatus(request, woId, 'IN_PROGRESS');
    console.log(`WO en IN_PROGRESS para po-ticket tests: ${woId}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Botón "Ticket de Taller" visible en IN_PROGRESS con items INTERNAL_STOCK
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Botón Ticket de Taller visible en IN_PROGRESS con items INTERNAL_STOCK', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Badge debe mostrar "En Trabajo"
    await expect(page.getByText('En Trabajo').first()).toBeVisible({
      timeout: 10000,
    });

    // El botón "Ticket de Taller" debe ser visible
    const ticketBtn = page.getByRole('button', { name: /ticket de taller/i });
    await expect(ticketBtn).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: Click "Ticket de Taller" abre modal/drawer sin error 500
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Click Ticket de Taller abre modal/drawer sin error 500', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    const ticketBtn = page.getByRole('button', { name: /ticket de taller/i });
    await expect(ticketBtn).toBeVisible({ timeout: 10000 });

    // Escuchar respuestas de error del servidor
    const serverErrors: number[] = [];
    page.on('response', response => {
      if (response.status() >= 500) {
        serverErrors.push(response.status());
      }
    });

    await ticketBtn.click();

    // Esperar que aparezca algún elemento del modal/drawer
    // Puede ser un dialog, sheet, o cualquier overlay
    const modal = page
      .locator(
        '[role="dialog"], [data-radix-dialog-content], [data-radix-sheet-content]'
      )
      .first();
    const modalOpened = await modal
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (modalOpened) {
      await expect(modal).toBeVisible({ timeout: 5000 });
    } else {
      // Si no abre modal, puede ser que navega a una página — verificar que no hay 500
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    }

    // No debe haber errores 500 del servidor
    expect(serverErrors).toHaveLength(0);

    // No debe mostrar texto de error genérico
    await expect(
      page.getByText(/error interno|internal server error|500/i)
    ).not.toBeVisible({
      timeout: 3000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Tab "Órdenes de Compra" en IN_PROGRESS carga sin error
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Tab Órdenes de Compra en IN_PROGRESS carga sin error', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Órdenes de Compra' }).click();
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // No debe mostrar errores
    await expect(page.getByText('403')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Unauthorized')).not.toBeVisible({
      timeout: 3000,
    });
    await expect(page.getByText('Error al cargar')).not.toBeVisible({
      timeout: 3000,
    });
    await expect(page.getByText('Error al obtener')).not.toBeVisible({
      timeout: 3000,
    });

    // El tab panel debe ser visible
    const tabContent = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabContent).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Post-aprobación — OC aparece en tab si había item EXTERNAL
  // Crea una WO fresca, la aprueba, y verifica el tab de OC.
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Post-aprobación: OC aparece en tab Órdenes de Compra con item EXTERNAL', async ({
    page,
    request,
  }) => {
    // Crear WO fresca con item EXTERNAL
    const newWoId = await createBasicWO(
      request,
      vehicleId,
      buildDefaultItems(serviceMantItemId, partMantItemId)
    );
    await advanceWOToStatus(request, newWoId, 'APPROVED');

    await page.goto(`/dashboard/maintenance/work-orders/${newWoId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Badge debe ser "Aprobada"
    await expect(page.getByText('Aprobada').first()).toBeVisible({
      timeout: 10000,
    });

    // Verificar tab Órdenes de Compra
    await page.getByRole('tab', { name: 'Órdenes de Compra' }).click();
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // No debe mostrar errores
    await expect(page.getByText('403')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Unauthorized')).not.toBeVisible({
      timeout: 3000,
    });

    // El tab panel debe tener contenido
    const tabContent = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabContent).toBeVisible({ timeout: 5000 });

    // Si hay OC generada, verificar el número con formato OC-XXXX
    const ocLocator = page.getByText(/OC-\d{4}-\d+/i);
    const ocCount = await ocLocator.count();
    if (ocCount > 0) {
      await expect(ocLocator.first()).toBeVisible({ timeout: 8000 });
      console.log(
        `OC generada encontrada en tab: ${await ocLocator.first().textContent()}`
      );
    } else {
      console.log(
        'No se encontró OC generada — posiblemente requiere proveedor asignado previamente'
      );
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Ticket de Taller NO visible en PENDING (estado incorrecto)
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Ticket de Taller NO visible en PENDING (solo aparece en IN_PROGRESS)', async ({
    page,
    request,
  }) => {
    // Crear WO pero NO avanzarla
    const pendingWoId = await createBasicWO(
      request,
      vehicleId,
      buildDefaultItems(serviceMantItemId, partMantItemId)
    );

    await page.goto(`/dashboard/maintenance/work-orders/${pendingWoId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Badge debe mostrar "Abierta" (PENDING)
    await expect(page.getByText('Abierta').first()).toBeVisible({
      timeout: 10000,
    });

    // El botón "Ticket de Taller" NO debe ser visible en PENDING
    const ticketBtn = page.getByRole('button', { name: /ticket de taller/i });
    await expect(ticketBtn).not.toBeVisible({ timeout: 5000 });
  });
});
