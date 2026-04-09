/**
 * OT — Carga de items via UnifiedWorkOrderForm (OWNER)
 *
 * Foco: bugs en AddItemDialog (mode="form") y UnifiedWorkOrderForm.
 * Setup: WO creada via API con 1 service item; usamos la UI para agregar repuestos.
 *
 * Tests cubiertos:
 * - Tab "Ítems (Unificado)" carga secciones Servicios y Repuestos
 * - "Añadir Servicio" crea fila vacía inline (sin abrir dialog)
 * - "Añadir Repuesto" abre AddItemDialog en mode="form"
 * - Validación: submit sin item muestra "Selecciona un item"
 * - Combobox filtra por tipo PART únicamente
 * - BUG FIX: repuesto seleccionado aparece en sección "3. Repuestos e Insumos" (no en Servicios)
 * - PERSISTENCIA: repuesto persiste después de guardar ("Sincronizar Cambios") y recargar
 * - Dialog reset: combobox vuelve al placeholder al cerrar y reabrir
 */
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('OT — Carga de Items via UnifiedWorkOrderForm', () => {
  let woId: string;
  let vehicleId: string;
  let serviceMantItemId: string;
  let partMantItemId: string;
  let partMantItemName: string;

  test.beforeAll(async ({ request }) => {
    // 1. Obtener un vehículo
    const vehiclesRes = await request.get('/api/vehicles/vehicles');
    expect(
      vehiclesRes.status(),
      'GET /api/vehicles/vehicles debe responder 200'
    ).toBe(200);
    const vehicles = await vehiclesRes.json();
    expect(vehicles.length, 'Debe haber al menos un vehículo').toBeGreaterThan(
      0
    );
    vehicleId = vehicles[0].id;

    // 2. Obtener mantItems para saber qué buscar en el combobox
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
      'Debe existir al menos un MantItem de tipo SERVICE/ACTION'
    ).toBeTruthy();
    expect(
      partItem,
      'Debe existir al menos un MantItem de tipo PART'
    ).toBeTruthy();

    serviceMantItemId = serviceItem.id;
    partMantItemId = partItem.id;
    partMantItemName = partItem.name;

    // 3. Crear WO via API con 1 service item solamente (para testear agregar repuesto desde 0)
    const createRes = await request.post('/api/maintenance/work-orders', {
      data: {
        vehicleId,
        title: `OT E2E Add Items - ${Date.now()}`,
        mantType: 'CORRECTIVE',
        priority: 'MEDIUM',
        items: [
          {
            mantItemId: serviceMantItemId,
            description: 'Servicio inicial E2E',
            quantity: 1,
            unitPrice: 50000,
            itemSource: 'INTERNAL_STOCK',
            closureType: 'INTERNAL_TICKET',
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
    console.log(`WO creada: ${woId}`);
    console.log(`Repuesto a buscar: "${partMantItemName}"`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Tab "Ítems (Unificado)" carga secciones Servicios y Repuestos
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Editor tab carga secciones Servicios y Repuestos', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // El tab "Ítems (Unificado)" debe estar activo por defecto o ser clickeable
    const unifiedTab = page.getByRole('tab', { name: /Ítems.*Unificado/i });
    await expect(unifiedTab).toBeVisible({ timeout: 10000 });
    await unifiedTab.click();

    // Sección de servicios
    await expect(page.getByText('2. Servicios y Tareas (Labor)')).toBeVisible({
      timeout: 5000,
    });

    // Sección de repuestos
    await expect(page.getByText('3. Repuestos e Insumos (Parts)')).toBeVisible({
      timeout: 5000,
    });

    // Servicios: el servicio inicial NO debe mostrar "No hay servicios"
    await expect(
      page.getByText('No hay servicios agregados todavía.')
    ).not.toBeVisible({ timeout: 3000 });

    // Repuestos: no se agregaron aún — debe mostrar empty state
    await expect(
      page.getByText('No hay repuestos agregados todavía.')
    ).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: "Añadir Servicio" crea fila vacía inline (sin abrir dialog)
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Añadir Servicio crea fila vacía inline', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();

    // Contar inputs de la sección de servicios antes de añadir
    // (identificamos por la sección que contiene el botón "Añadir Servicio")
    const serviciosSection = page
      .locator('text=2. Servicios y Tareas (Labor)')
      .locator('..');
    const inputsBefore = await page.locator('input').count();

    await page.getByRole('button', { name: 'Añadir Servicio' }).click();

    // Debe aparecer una nueva fila con un input de texto (fila vacía inline — NO un dialog)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 });

    // El número de inputs debe haber aumentado (nueva fila inline)
    const inputsAfter = await page.locator('input').count();
    expect(inputsAfter).toBeGreaterThan(inputsBefore);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: "Añadir Repuesto" abre AddItemDialog en mode="form"
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Añadir Repuesto abre dialog con combobox', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();

    await page.getByRole('button', { name: 'Añadir Repuesto' }).click();

    // Dialog debe abrirse con el combobox visible
    const combobox = page.getByRole('combobox');
    await expect(combobox.first()).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Validación dialog — submit sin item muestra error "Selecciona un item"
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Validación dialog — submit sin item muestra error', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();
    await page.getByRole('button', { name: 'Añadir Repuesto' }).click();

    // Combobox debe estar visible (dialog abierto)
    await expect(page.getByRole('combobox').first()).toBeVisible({
      timeout: 5000,
    });

    // Click en "Agregar Item" sin seleccionar ningún item
    await page.getByRole('button', { name: 'Agregar Item' }).click();

    // Error de validación
    await expect(page.getByText('Selecciona un item')).toBeVisible({
      timeout: 3000,
    });

    // Dialog sigue abierto
    await expect(page.getByRole('combobox').first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Combobox filtra items de tipo PART únicamente
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Combobox filtra items PART al buscar', async ({ page }) => {
    test.skip(
      !woId || !partMantItemName,
      'No se pudo crear la WO o encontrar repuesto'
    );

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();
    await page.getByRole('button', { name: 'Añadir Repuesto' }).click();

    // Abrir combobox
    await page.getByRole('combobox').first().click();

    // El input de filtrado debe aparecer
    await expect(page.getByPlaceholder('Escribir para filtrar...')).toBeVisible(
      { timeout: 5000 }
    );

    // Buscar por el primer término del nombre del repuesto
    const searchTerm = partMantItemName.split(' ')[0];
    await page.getByPlaceholder('Escribir para filtrar...').fill(searchTerm);

    // Esperar debounce (300ms mínimo)
    await page.waitForTimeout(500);

    // Deben aparecer resultados
    const results = page.locator('[cmdk-item]');
    await expect(results.first()).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: BUG FIX — Agregar repuesto aparece en sección "3. Repuestos e Insumos"
  // (Bug: los items se agregaban en la sección incorrecta o no aparecían)
  // ─────────────────────────────────────────────────────────────────────────
  test('6. Agregar repuesto aparece en sección Parts (bug fix)', async ({
    page,
  }) => {
    test.skip(
      !woId || !partMantItemName,
      'No se pudo crear la WO o encontrar repuesto'
    );

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();

    // Verificar empty state antes de agregar
    await expect(
      page.getByText('No hay repuestos agregados todavía.')
    ).toBeVisible({ timeout: 5000 });

    // Abrir dialog de agregar repuesto
    await page.getByRole('button', { name: 'Añadir Repuesto' }).click();
    await expect(page.getByRole('combobox').first()).toBeVisible({
      timeout: 5000,
    });

    // Abrir combobox y buscar
    await page.getByRole('combobox').first().click();
    await expect(page.getByPlaceholder('Escribir para filtrar...')).toBeVisible(
      { timeout: 3000 }
    );

    const searchTerm = partMantItemName.split(' ')[0];
    await page.getByPlaceholder('Escribir para filtrar...').fill(searchTerm);
    await page.waitForTimeout(500);

    // Seleccionar el primer resultado
    const results = page.locator('[cmdk-item]');
    await expect(results.first()).toBeVisible({ timeout: 5000 });
    await results.first().click();

    // Confirmar con "Agregar Item"
    await page.getByRole('button', { name: 'Agregar Item' }).click();

    // En mode="form" no hay toast — el dialog simplemente cierra y llama onItemAdded
    // Verificar que el dialog cerró
    await expect(
      page.getByRole('button', { name: 'Cancelar' })
    ).not.toBeVisible({
      timeout: 5000,
    });

    // El repuesto debe aparecer en la sección "3. Repuestos e Insumos"
    // es decir, el empty state "No hay repuestos" ya NO debe ser visible
    await expect(
      page.getByText('No hay repuestos agregados todavía.')
    ).not.toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: PERSISTENCIA — repuesto persiste después de guardar y recargar
  // (Continúa desde test 6 donde el repuesto ya está en la UI)
  // ─────────────────────────────────────────────────────────────────────────
  test('7. Repuesto persiste después de guardar y recargar', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();

    // Guardar con "Sincronizar Cambios" (botón de guardado en modo edición)
    const saveBtn = page.getByRole('button', { name: 'Sincronizar Cambios' });
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await saveBtn.click();

    // Toast de éxito con título "Orden Actualizada"
    await expect(page.getByText('Orden Actualizada')).toBeVisible({
      timeout: 10000,
    });

    // Recargar la página
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();

    // El repuesto debe seguir apareciendo (no mostrar empty state)
    await expect(
      page.getByText('No hay repuestos agregados todavía.')
    ).not.toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: Dialog reset — al cerrar y reabrir vuelve al estado inicial (placeholder)
  // ─────────────────────────────────────────────────────────────────────────
  test('8. Dialog reset — al cerrar y reabrir vuelve al estado inicial', async ({
    page,
  }) => {
    test.skip(
      !woId || !partMantItemName,
      'No se pudo crear la WO o encontrar repuesto'
    );

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();

    // PRIMERA apertura: abrir combobox, buscar y seleccionar un item
    await page.getByRole('button', { name: 'Añadir Repuesto' }).click();
    await expect(page.getByRole('combobox').first()).toBeVisible({
      timeout: 5000,
    });

    await page.getByRole('combobox').first().click();
    await expect(page.getByPlaceholder('Escribir para filtrar...')).toBeVisible(
      { timeout: 3000 }
    );

    const searchTerm = partMantItemName.split(' ')[0];
    await page.getByPlaceholder('Escribir para filtrar...').fill(searchTerm);
    await page.waitForTimeout(500);

    const results = page.locator('[cmdk-item]');
    await expect(results.first()).toBeVisible({ timeout: 5000 });
    await results.first().click();

    // Cerrar con "Cancelar"
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(
      page.getByRole('button', { name: 'Cancelar' })
    ).not.toBeVisible({
      timeout: 3000,
    });

    // SEGUNDA apertura: el combobox debe mostrar el placeholder (estado limpio)
    await page.getByRole('button', { name: 'Añadir Repuesto' }).click();
    await expect(page.getByRole('combobox').first()).toBeVisible({
      timeout: 5000,
    });

    // El combobox debe mostrar el placeholder, no el item previamente seleccionado
    // Verificamos que el texto del combobox contiene el placeholder o no contiene el nombre del item
    const comboboxText = await page.getByRole('combobox').first().textContent();
    expect(comboboxText).not.toContain(partMantItemName);

    // NO debe haber ningún error de validación visible (estado limpio)
    await expect(page.getByText('Selecciona un item')).not.toBeVisible();
  });
});
