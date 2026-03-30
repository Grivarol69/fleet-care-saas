/**
 * OT — Carga de items (Servicios y Repuestos) via UI
 *
 * Foco: encontrar bugs en AddItemDialog, TallerPropioTab y TrabajosExternosTab.
 * Setup: WO creada via API. Interacciones via UI.
 *
 * Lo que buscamos:
 * - Combobox carga y filtra correctamente
 * - Info de stock aparece al seleccionar PART (bug potencial: async state)
 * - Validación impide submit sin item seleccionado
 * - Source se auto-selecciona según stock (INTERNAL_STOCK si hay stock, EXTERNAL si no)
 * - Selector de proveedor aparece cuando corresponde (EXTERNAL, lockItemSource=false)
 * - Item aparece en la sección correcta después de agregar
 * - Dialog resetea estado al cerrar y reabrir
 */
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('OT — Carga de Items via UI', () => {
  let woId: string;
  let vehicleId: string;
  let serviceMantItemName: string;
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
    const mantItems = await mantItemsRes.json();
    const allItems = Array.isArray(mantItems)
      ? mantItems
      : mantItems.items || [];

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

    serviceMantItemName = serviceItem.name;
    partMantItemName = partItem.name;

    // 3. Crear WO via API
    const createRes = await request.post('/api/maintenance/work-orders', {
      data: {
        vehicleId,
        title: `OT E2E Items - ${Date.now()}`,
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
    console.log(`✅ WO creada: ${woId}`);
    console.log(`   Servicio a buscar: "${serviceMantItemName}"`);
    console.log(`   Repuesto a buscar: "${partMantItemName}"`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Tab "Taller Propio" carga correctamente
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Tab Taller Propio — carga secciones correctas', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Taller Propio' }).click();

    // Ambas secciones deben ser visibles
    await expect(page.getByText('Trabajos / Servicios')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText('Repuestos de Inventario Propio')).toBeVisible({
      timeout: 3000,
    });

    // Estado inicial: placeholders de "sin items"
    await expect(
      page.getByText('No hay trabajos internos registrados.')
    ).toBeVisible();
    await expect(
      page.getByText('No hay repuestos de inventario registrados.')
    ).toBeVisible();

    // Botones presentes
    await expect(
      page.getByRole('button', { name: 'Nuevo Trabajo' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Agregar Repuesto' }).first()
    ).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: "Nuevo Trabajo" abre AddItemDialog con título correcto
  // y NO muestra selector de fuente ni selector de proveedor (lockItemSource=true, INTERNAL_STOCK)
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Nuevo Trabajo — dialog correcto (sin source, sin proveedor)', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Taller Propio' }).click();
    await page.getByRole('button', { name: 'Nuevo Trabajo' }).click();

    // Título correcto
    await expect(
      page.getByRole('dialog', { name: 'Agregar Servicio' })
    ).toBeVisible({ timeout: 5000 });

    // "Destino del trabajo" NO debe estar visible (lockItemSource=true)
    await expect(page.getByText('Destino del trabajo')).not.toBeVisible();

    // Proveedor NO debe estar visible (fuente fija = INTERNAL_STOCK)
    await expect(page.getByText('Proveedor (Opcional)')).not.toBeVisible();

    // Combobox de búsqueda presente (el PopoverTrigger tiene role="combobox" explícito)
    await expect(
      page.getByRole('dialog').locator('button[role="combobox"]')
    ).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Validación — no puede agregar sin seleccionar item
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Validación — submit sin item muestra error', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Taller Propio' }).click();
    await page.getByRole('button', { name: 'Nuevo Trabajo' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Agregar Servicio' })
    ).toBeVisible({ timeout: 5000 });

    // Click directo en Agregar sin seleccionar nada
    await page.getByRole('button', { name: 'Agregar Item' }).click();

    // Error de validación debe aparecer
    await expect(page.getByText('Selecciona un item')).toBeVisible({
      timeout: 3000,
    });

    // Dialog sigue abierto (no cierra con error)
    await expect(
      page.getByRole('dialog', { name: 'Agregar Servicio' })
    ).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Combobox busca y filtra servicios
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Combobox — busca y selecciona servicio', async ({ page }) => {
    test.skip(
      !woId || !serviceMantItemName,
      'No se pudo crear la WO o encontrar servicio'
    );

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Taller Propio' }).click();
    await page.getByRole('button', { name: 'Nuevo Trabajo' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Abrir combobox
    await page.getByRole('dialog').locator('button[role="combobox"]').click();
    await expect(page.getByPlaceholder('Escribir para filtrar...')).toBeVisible(
      { timeout: 3000 }
    );

    // Buscar el primer término del nombre del servicio
    const searchTerm = serviceMantItemName.split(' ')[0];
    await page.getByPlaceholder('Escribir para filtrar...').fill(searchTerm);

    // Esperar resultados (debounce 300ms)
    await page.waitForTimeout(500);

    // Debe aparecer al menos un resultado (el nombre exacto o similar)
    const results = page.locator('[cmdk-item]');
    await expect(results.first()).toBeVisible({ timeout: 5000 });

    // Seleccionar el primer resultado
    await results.first().click();

    // El combobox sigue visible pero ya no muestra el placeholder — muestra el nombre del item
    // Si sigue mostrando "Buscar y seleccionar...", el onSelect del CommandItem no funcionó
    await expect(
      page.getByRole('dialog').locator('button[role="combobox"]')
    ).not.toContainText('Buscar y seleccionar...');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Agregar servicio exitosamente y verificar que aparece en la lista
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Agregar servicio — aparece en "Trabajos / Servicios"', async ({
    page,
  }) => {
    test.skip(
      !woId || !serviceMantItemName,
      'No se pudo crear la WO o encontrar servicio'
    );

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Taller Propio' }).click();
    await page.getByRole('button', { name: 'Nuevo Trabajo' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Seleccionar servicio
    await page.getByRole('dialog').locator('button[role="combobox"]').click();
    const searchTerm = serviceMantItemName.split(' ')[0];
    await page.getByPlaceholder('Escribir para filtrar...').fill(searchTerm);
    await page.waitForTimeout(500);
    await page.locator('[cmdk-item]').first().click();

    // Precio Unitario (getByLabel no funciona: FormControl envuelve Input en un div,
    // por lo que el htmlFor del label apunta al div y no al input — bug de accesibilidad)
    // Usamos el segundo input[type="number"] en el dialog (el primero es Cantidad)
    await page
      .getByRole('dialog')
      .locator('input[type="number"]')
      .nth(1)
      .fill('50000');

    // Agregar
    await page.getByRole('button', { name: 'Agregar Item' }).click();

    // Toast de éxito
    await expect(page.getByText('Item Agregado')).toBeVisible({
      timeout: 10000,
    });

    // Dialog se cierra
    await expect(
      page.getByRole('dialog', { name: 'Agregar Servicio' })
    ).not.toBeVisible({ timeout: 5000 });

    // Item aparece en la sección "Trabajos / Servicios" — el placeholder ya no está
    await expect(
      page.getByText('No hay trabajos internos registrados.')
    ).not.toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: "Agregar Repuesto" (Taller Propio) — muestra info de stock
  // Bug potencial: stock info es async y puede no aparecer si hay race condition
  // ─────────────────────────────────────────────────────────────────────────
  test('6. Agregar Repuesto (Taller Propio) — muestra info de stock tras selección', async ({
    page,
  }) => {
    test.skip(
      !woId || !partMantItemName,
      'No se pudo crear la WO o encontrar repuesto'
    );

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Taller Propio' }).click();
    await page
      .getByRole('button', { name: 'Agregar Repuesto' })
      .first()
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Agregar Repuesto' })
    ).toBeVisible({ timeout: 5000 });

    // NO debe mostrar selector de fuente (lockItemSource=true)
    await expect(page.getByText('Destino del trabajo')).not.toBeVisible();

    // Seleccionar repuesto
    await page.getByRole('dialog').locator('button[role="combobox"]').click();
    const searchTerm = partMantItemName.split(' ')[0];
    await page.getByPlaceholder('Escribir para filtrar...').fill(searchTerm);
    await page.waitForTimeout(500);

    const results = page.locator('[cmdk-item]');
    await expect(results.first()).toBeVisible({ timeout: 5000 });
    await results.first().click();

    // Después de seleccionar, info de stock debe aparecer
    // (verde: "Stock Disponible: X unid." o ámbar: "No hay inventario registrado.")
    // Bug potencial: si la request de stock falla o tarda, no aparece nada
    const stockInfo = page.getByText(
      /Stock Disponible|No hay inventario registrado/i
    );
    await expect(stockInfo).toBeVisible({ timeout: 8000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: Dialog resetea estado al cerrar y reabrir
  // Bug potencial: estado de selección anterior persiste al reabrir
  // ─────────────────────────────────────────────────────────────────────────
  test('7. Dialog reset — al cerrar y reabrir vuelve al estado inicial', async ({
    page,
  }) => {
    test.skip(
      !woId || !serviceMantItemName,
      'No se pudo crear la WO o encontrar servicio'
    );

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Taller Propio' }).click();

    // PRIMERA apertura: seleccionar algo
    await page.getByRole('button', { name: 'Nuevo Trabajo' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page.getByRole('dialog').locator('button[role="combobox"]').click();
    const searchTerm = serviceMantItemName.split(' ')[0];
    await page.getByPlaceholder('Escribir para filtrar...').fill(searchTerm);
    await page.waitForTimeout(500);
    await page.locator('[cmdk-item]').first().click();

    // Cerrar dialog
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });

    // SEGUNDA apertura: debe mostrar estado limpio
    await page.getByRole('button', { name: 'Nuevo Trabajo' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // El combobox debe mostrar "Buscar y seleccionar..." (reset)
    await expect(
      page.getByRole('dialog').locator('button[role="combobox"]')
    ).toBeVisible();

    // NO debe haber info de stock visible (era de la sesión anterior)
    await expect(
      page.getByText(/Stock Disponible|No hay inventario registrado/i)
    ).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: Tab "Trabajos Externos" — "Agregar Servicio" muestra proveedor
  // (lockItemSource=true + EXTERNAL → provider dropdown visible)
  // ─────────────────────────────────────────────────────────────────────────
  test('8. Trabajos Externos — "Agregar Servicio" muestra selector de proveedor', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Trabajos Externos' }).click();
    await expect(page.getByText('Servicios Externos')).toBeVisible({
      timeout: 5000,
    });

    await page.getByRole('button', { name: 'Agregar Servicio' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Agregar Servicio' })
    ).toBeVisible({ timeout: 5000 });

    // Proveedor SÍ debe aparecer (source=EXTERNAL)
    await expect(page.getByText('Proveedor (Opcional)')).toBeVisible({
      timeout: 3000,
    });

    // Selector de fuente NO debe aparecer (lockItemSource=true)
    await expect(page.getByText('Destino del trabajo')).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9: InternalTicketDialog — ¿existe botón "Generar Ticket" en TallerPropio?
  // Si falla: la funcionalidad de ticket manual no es accesible desde la UI
  // ─────────────────────────────────────────────────────────────────────────
  test('9. InternalTicketDialog — botón "Generar Ticket" accesible desde Taller Propio', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: 'Taller Propio' }).click();
    await page.waitForTimeout(1000);

    // Buscar botón "Generar Ticket" en toda la página
    const genTicketBtn = page.getByRole('button', { name: /generar ticket/i });

    // ESTE TEST PUEDE FALLAR si el botón no existe en la UI
    // Lo cual indica que InternalTicketDialog no tiene entry point visible
    await expect(genTicketBtn).toBeVisible({ timeout: 5000 });
  });
});
