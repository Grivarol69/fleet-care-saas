# Mejoras Futuras - Fleet Care SaaS

**Fecha:** 2026-02-11
**Estado:** Documento vivo - actualizar con cada nueva idea

---

## 1. Watchdog Financiero - Auto-aprendizaje de Precios

**Prioridad:** Alta (post-lanzamiento inmediato)
**Estado actual:** Watchdog funcional con comparacion contra `referencePrice` de MasterPart

### Estrategia de precios de referencia

1. **Lanzamiento:** Primer cliente carga precios reales de mercado en MasterParts globales
2. Esos precios se convierten en `referencePrice` global (tenantId: null)
3. Nuevos clientes del mismo pais heredan esos precios desde el dia 1
4. El watchdog funciona para todos desde el arranque

### Mejora futura: Promedio ponderado movil

- Despues de cada compra exitosa (no flaggeada), actualizar `referencePrice` con promedio ponderado
- Usar datos de `PartPriceHistory` (ya registra cada compra con precio, proveedor, fecha)
- Cross-tenant: promediar precios de todos los tenants del mismo pais
- Esto hace que los precios de referencia evolucionen con el mercado real

### Archivos relevantes

- `src/lib/services/FinancialWatchdogService.ts` - Servicio watchdog
- `src/app/api/inventory/purchases/route.ts` - Watchdog inline (linea 154)
- `src/app/api/maintenance/work-orders/[id]/expenses/route.ts` - Usa el service
- `src/app/api/financial/alerts/route.ts` - API de alertas
- `src/components/dashboard/FinancialDashboard/FinancialAlertsWidget.tsx` - Widget UI

---

## 2. Plantillas de Mantenimiento Correctivo

**Prioridad:** Media
**Estado actual:** Schema soporta MantType: PREVENTIVE, PREDICTIVE, CORRECTIVE, EMERGENCY

### Concepto

Catalogo de "recetas" para problemas comunes (ej: "Rotura cano escape") con items pre-cargados.
Se aplican on-demand al crear una OT correctiva, a diferencia de las preventivas que se disparan por km/tiempo.

### Diferencia con preventivas

- **Preventivas (actuales):** Se disparan por km/tiempo, asociadas a vehiculo via programa
- **Correctivas (nueva):** Catalogo de recetas, se aplican manualmente cuando surge la novedad

---

## 3. Fase 2 Post-Lanzamiento

### 3.1 Gestion de Combustible
- Modulo FuelLog para registro de cargas
- Calculo de rendimiento (Km/Galon) y costo por kilometro

### 3.2 Inventario Avanzado
- Alertas de stock bajo configurables por item
- Valoracion monetaria del inventario y reportes de kardex
- Kardex visual en UI

### 3.3 Dashboard PRO
- KPIs de negocio: Costo Total de Propiedad (TCO), Uptime/Downtime
- Graficos interactivos y analisis de tendencias

### 3.4 Escaneo de Facturas con Claude Vision (Anthropic API)

**Probado con exito al 100% usando Claude Web.** Pendiente implementar con la API.

**Historial:** Se implemento con Google Vision + Document AI pero los resultados no fueron satisfactorios. Se probo manualmente con Claude (version web) y la interpretacion fue perfecta. La decision es implementar con Claude Vision API (Anthropic).

**Que se necesita:**
- Endpoint POST que reciba imagen/PDF (FormData, max 10MB, JPG/PNG/PDF)
- Enviar al API de Anthropic con Claude Vision (modelo con capacidad de imagen)
- Prompt estructurado para extraer: numero factura, fecha, proveedor (NIT), items (descripcion, cantidad, precio, total), subtotal, IVA, total
- Respuesta en JSON estructurado para pre-llenar formularios
- Soporte para formato colombiano (COP, NIT, IVA 19%)

**Puntos de integracion en la UI:**
- `invoices/new` - Ya tiene seccion "Factura Escaneada (Opcional)" con upload
- `inventory/purchases/new` - Podria escanear facturas de compra de repuestos
- Conectar la respuesta del OCR al formulario para pre-llenar campos

**Codigo eliminado (no reutilizable):**
- `src/lib/ocr/google-vision.ts` - Eliminado
- `src/lib/ocr/document-ai.ts` - Eliminado
- `src/app/api/ocr/invoice/route.ts` - Eliminado
- `src/app/api/ocr/invoice-documentai/route.ts` - Eliminado
- Dependencias `@google-cloud/vision` y `@google-cloud/documentai` removidas

---

## 4. Deuda Tecnica Conocida

### 4.1 Testing
- Sin tests automatizados (unit, integration, e2e)
- Priorizar: Jest + Testing Library para componentes criticos, Playwright para E2E

### 4.2 Seguridad
- Auditar que todos los endpoints POST/PUT usen Zod + validen tenantId
- Verificar que operaciones complejas usen prisma.$transaction

### 4.3 Performance
- Bundle size puede ser excesivo - analizar con `pnpm build:analyze`
- Implementar dynamic imports para componentes grandes
- Optimizar imports de Radix UI y Lucide

### 4.4 UX
- Loading skeletons en flujos complejos
- Mobile responsiveness en tablas complejas (OTs, inventario)
- Error boundaries

### 4.5 Infraestructura
- CI/CD pipeline (GitHub Actions)
- Monitoreo y error tracking (Sentry)
- Background jobs para procesos pesados (OCR)

---

## 5. Ideas de Negocio SaaS

### 5.1 Marketplace de Repuestos
- Conectar proveedores con empresas de la plataforma
- Cotizaciones automaticas basadas en OC generadas

### 5.2 Internacionalizacion (i18n)
- Soporte para espanol/ingles
- Formateo de fechas/numeros por locale

### 5.3 PWA
- Service Worker para caching
- Notificaciones push
- Modo offline basico

---

*Ultima actualizacion: 2026-02-11*
