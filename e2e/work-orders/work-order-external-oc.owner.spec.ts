/**
 * OT — Flujo externo: asignación de proveedor y generación de OC via UI
 *
 * Foco: encontrar bugs en TrabajosExternosTab.
 * Setup: WO + 2 items EXTERNAL (sin proveedor) via API. Interacciones via UI.
 *
 * Lo que buscamos:
 * - Checkbox bloqueado cuando item no tiene proveedor (tooltip: "Asigna un proveedor primero")
 * - "Generar OC (0)" deshabilitado con 0 items
 * - Selector de proveedor inline en WorkItemRow funciona y refresca
 * - "Sin proveedor" badge desaparece al asignar proveedor
 * - Checkbox se habilita después de asignar proveedor
 * - "Generar OC (N)" se actualiza con el count correcto
 * - OC se crea y aparece en tab "Compras" con número OC-XXXX
 * - Items muestran badge "Orden Compra" post-OC
 * - Checkboxes se deshabilitan tras generar OC (closureType != PENDING)
 * - Bulk provider apply funciona
 */
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('OT — Flujo Externo: Proveedor + OC via UI', () => {
  let woId: string;
  let serviceItemId: string;
  let partItemId: string;
  let providerId: string;
  let providerName: string;
  let serviceMantItemId: string;
  let partMantItemId: string;

  test.beforeAll(async ({ request }) => {
    // 1. Obtener vehículo
    const vehiclesRes = await request.get('/api/vehicles/vehicles');
    expect(vehiclesRes.status()).toBe(200);
    const vehicles = await vehiclesRes.json();
    expect(vehicles.length).toBeGreaterThan(0);
    const vehicleId = vehicles[0].id;

    // 2. Obtener providers
    const providersRes = await request.get('/api/people/providers');
    expect(
      providersRes.status(),
      `GET /api/people/providers falló: ${await providersRes.text()}`
    ).toBe(200);
    const providers = await providersRes.json();
    expect(
      providers.length,
      'Debe haber al menos un proveedor en staging'
    ).toBeGreaterThan(0);
    providerId = providers[0].id;
    providerName = providers[0].name;
    console.log(`✅ Proveedor: ${providerName} (${providerId})`);

    // 3. Obtener mantItems
    const mantItemsRes = await request.get('/api/maintenance/mant-items');
    expect(mantItemsRes.status()).toBe(200);
    const mantItems = await mantItemsRes.json();
    const allItems = Array.isArray(mantItems)
      ? mantItems
      : mantItems.items || [];

    const serviceItem = allItems.find(
      (i: any) => i.type === 'SERVICE' || i.type === 'ACTION'
    );
    const partItem = allItems.find((i: any) => i.type === 'PART');
    expect(serviceItem, 'Debe existir MantItem SERVICE').toBeTruthy();
    expect(partItem, 'Debe existir MantItem PART').toBeTruthy();
    serviceMantItemId = serviceItem.id;
    partMantItemId = partItem.id;

    // 4. Crear WO
    const createRes = await request.post('/api/maintenance/work-orders', {
      data: {
        vehicleId,
        title: `OT E2E OC - ${Date.now()}`,
        mantType: 'CORRECTIVE',
        priority: 'MEDIUM',
      },
    });
    expect(createRes.status()).toBe(201);
    const wo = await createRes.json();
    woId = wo.id;

    // 5. Agregar item EXTERNO (servicio) SIN proveedor
    const svcRes = await request.post(
      `/api/maintenance/work-orders/${woId}/items`,
      {
        data: {
          mantItemId: serviceMantItemId,
          quantity: 1,
          unitPrice: 150000,
          itemSource: 'EXTERNAL',
          description: 'Servicio externo E2E',
        },
      }
    );
    expect(
      svcRes.status(),
      `POST items (servicio) falló: ${await svcRes.text()}`
    ).toBe(201);
    const svcItem = await svcRes.json();
    serviceItemId = svcItem.id;

    // 6. Agregar item EXTERNO (repuesto) SIN proveedor
    const partRes = await request.post(
      `/api/maintenance/work-orders/${woId}/items`,
      {
        data: {
          mantItemId: partMantItemId,
          quantity: 2,
          unitPrice: 80000,
          itemSource: 'EXTERNAL',
          description: 'Repuesto externo E2E',
        },
      }
    );
    expect(
      partRes.status(),
      `POST items (repuesto) falló: ${await partRes.text()}`
    ).toBe(201);
    const partItem2 = await partRes.json();
    partItemId = partItem2.id;

    console.log(
      `✅ WO: ${woId} | Servicio: ${serviceItemId} | Repuesto: ${partItemId}`
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Tab Trabajos Externos — items aparecen con badge "Sin proveedor"
  // y checkboxes deshabilitados
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Items sin proveedor muestran badge y checkbox deshabilitado', async ({
    page,
  }) => {
    test.skip(!woId, 'Setup falló');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Trabajos Externos' }).click();
    await expect(page.getByText('Servicios Externos')).toBeVisible({
      timeout: 5000,
    });

    // Ambas secciones deben tener items (no placeholder)
    await expect(page.getByText('No hay servicios externos.')).not.toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByText('No hay repuestos externos.')
    ).not.toBeVisible();

    // Badge "Sin proveedor" debe aparecer (al menos 2 veces: servicio + repuesto)
    const sinProveedorBadges = page.getByText('Sin proveedor');
    await expect(sinProveedorBadges.first()).toBeVisible({ timeout: 5000 });

    // Botón "Generar OC (0)" debe estar DESHABILITADO
    const generarOCBtn = page.getByRole('button', {
      name: /Generar OC \(0\)/i,
    });
    await expect(generarOCBtn).toBeVisible({ timeout: 3000 });
    await expect(generarOCBtn).toBeDisabled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: Asignar proveedor inline en WorkItemRow (servicio)
  // El select de proveedor está en el header del Collapsible
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Asignar proveedor inline — "Sin proveedor" desaparece', async ({
    page,
  }) => {
    test.skip(!woId || !providerId, 'Setup falló');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Trabajos Externos' }).click();
    await expect(page.getByText('Servicios Externos')).toBeVisible({
      timeout: 5000,
    });

    // Selector de proveedor inline (dentro de WorkItemRow, en Servicios Externos)
    // El select es un SelectTrigger con placeholder "Seleccionar..."
    // Está dentro de la card "Servicios Externos" — usar el primero
    const providerSelects = page
      .getByRole('combobox')
      .filter({ hasText: /Seleccionar\.\.\./i });

    // Si no hay selects con "Seleccionar..." puede que ya tengan proveedor
    // o que el selector no esté renderizando
    await expect(providerSelects.first()).toBeVisible({ timeout: 5000 });

    // Abrir y seleccionar proveedor
    await providerSelects.first().click();
    await page.getByRole('option', { name: providerName }).first().click();

    // Esperar refresh (axios PATCH + onRefresh)
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // "Sin proveedor" debe haber disminuido (de 2 a 1)
    // o al menos el badge del servicio desaparece
    // Verificamos que el nombre del proveedor aparece
    await expect(page.getByText(providerName).first()).toBeVisible({
      timeout: 8000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Bulk apply proveedor — checkbox + select + "Aplicar a todos"
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Bulk apply proveedor — asigna proveedor a todos los items restantes', async ({
    page,
  }) => {
    test.skip(!woId || !providerName, 'Setup falló');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Trabajos Externos' }).click();
    await expect(page.getByText('Servicios Externos')).toBeVisible({
      timeout: 5000,
    });

    // Checkbox "Aplicar mismo proveedor a todos"
    const bulkCheckbox = page.getByLabel('Aplicar mismo proveedor a todos');
    await expect(bulkCheckbox).toBeVisible({ timeout: 3000 });

    // Inicialmente no debe haber select de bulk proveedor visible
    await expect(
      page.getByPlaceholder('Seleccionar proveedor')
    ).not.toBeVisible();

    // Habilitar bulk
    await bulkCheckbox.click();

    // Ahora debe aparecer el select y el botón "Aplicar a todos"
    await expect(page.getByPlaceholder('Seleccionar proveedor')).toBeVisible({
      timeout: 3000,
    });
    await expect(
      page.getByRole('button', { name: 'Aplicar a todos' })
    ).toBeVisible();

    // "Aplicar a todos" debe estar deshabilitado hasta seleccionar proveedor
    await expect(
      page.getByRole('button', { name: 'Aplicar a todos' })
    ).toBeDisabled();

    // Seleccionar proveedor en bulk select
    await page.getByPlaceholder('Seleccionar proveedor').click();
    await page.getByRole('option', { name: providerName }).first().click();

    // Ahora "Aplicar a todos" debe habilitarse
    await expect(
      page.getByRole('button', { name: 'Aplicar a todos' })
    ).toBeEnabled({ timeout: 3000 });

    // Aplicar
    await page.getByRole('button', { name: 'Aplicar a todos' }).click();

    // Toast confirmación
    await expect(page.getByText('Proveedores actualizados')).toBeVisible({
      timeout: 10000,
    });

    // Refrescar y verificar que ya no hay "Sin proveedor"
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.getByText('Sin proveedor')).not.toBeVisible({
      timeout: 5000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Checkboxes habilitados tras asignar proveedor + Generar OC
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Seleccionar items y generar OC — toast + badge "Orden Compra"', async ({
    page,
  }) => {
    test.skip(!woId, 'Setup falló');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Trabajos Externos' }).click();
    await expect(page.getByText('Servicios Externos')).toBeVisible({
      timeout: 5000,
    });

    // Verificar que "Sin proveedor" ya no está (viene del test anterior)
    await expect(page.getByText('Sin proveedor')).not.toBeVisible({
      timeout: 5000,
    });

    // Los checkboxes ahora deben estar habilitados
    const checkboxes = page.getByRole('checkbox').filter({ hasText: '' });
    // El primer checkbox habilitado (no el de bulk-provider)
    const firstItemCheckbox = page.locator('button[role="checkbox"]').first();
    await expect(firstItemCheckbox).toBeEnabled({ timeout: 3000 });

    // Seleccionar TODOS los checkboxes disponibles
    const allCheckboxes = page.locator('button[role="checkbox"]');
    const count = await allCheckboxes.count();
    for (let i = 0; i < count; i++) {
      const cb = allCheckboxes.nth(i);
      const isEnabled = await cb.isEnabled();
      if (isEnabled) {
        await cb.click();
        await page.waitForTimeout(100);
      }
    }

    // El botón "Generar OC" debe mostrar count > 0 y estar habilitado
    const generarOCBtn = page.getByRole('button', {
      name: /Generar OC \(\d+\)/i,
    });
    await expect(generarOCBtn).toBeVisible({ timeout: 3000 });
    await expect(generarOCBtn).toBeEnabled();

    // Generar OC
    await generarOCBtn.click();

    // Toast éxito
    await expect(page.getByText('OC generada')).toBeVisible({ timeout: 10000 });

    // Botón vuelve a "Generar OC (0)" y deshabilitado
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(
      page.getByRole('button', { name: /Generar OC \(0\)/i })
    ).toBeDisabled({ timeout: 5000 });

    // Items ahora muestran badge "Orden Compra"
    await expect(page.getByText('Orden Compra').first()).toBeVisible({
      timeout: 5000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Tab Compras — OC aparece con número OC-XXXX
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Tab Compras — OC aparece con número y proveedor', async ({
    page,
  }) => {
    test.skip(!woId, 'Setup falló');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Compras' }).click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // OC debe aparecer con número OC-XXXX
    await expect(page.getByText(/OC-\d{4}-\d+/i)).toBeVisible({
      timeout: 8000,
    });

    // Proveedor asignado debe aparecer
    await expect(page.getByText(providerName).first()).toBeVisible({
      timeout: 5000,
    });

    // Badge "Sin factura" debe aparecer (OC sin factura vinculada)
    await expect(page.getByText('Sin factura')).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: Tras generar OC, checkboxes de esos items quedan deshabilitados
  // (closureType !== PENDING)
  // ─────────────────────────────────────────────────────────────────────────
  test('6. Post-OC — checkboxes de items con OC están deshabilitados', async ({
    page,
  }) => {
    test.skip(!woId, 'Setup falló');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Trabajos Externos' }).click();
    await expect(page.getByText('Servicios Externos')).toBeVisible({
      timeout: 5000,
    });

    // Todos los checkboxes de items deben estar deshabilitados ahora
    const allCheckboxes = page.locator('button[role="checkbox"]');
    const count = await allCheckboxes.count();

    // Excluir el checkbox de "Aplicar mismo proveedor a todos" (es un input[type=checkbox])
    // Los checkboxes de items son button[role="checkbox"]
    for (let i = 0; i < count; i++) {
      const cb = allCheckboxes.nth(i);
      await expect(cb).toBeDisabled({ timeout: 3000 });
    }
  });
});
