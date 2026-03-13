# Proposal: KB Population con Claude Vision API

## Intent

El SaaS Fleet Care necesita que el "Knowledge Base" global esté poblado para brindar un inmenso valor predeterminado desde el día 1 (Ej: intervalos y repuestos OEM correctos por vehículo). Poblar manualmente la tabla `MantItemVehiclePart` a partir de manuales OEM es lento, tedioso y propenso a errores humanos. Esta iniciativa resolverá ese cuello de botella usando la API de Claude Vision para extraer, desde PDFs de manuales de servicio, planes de mantenimiento estructurados directamente listos para revisión.

## Scope

### In Scope
- Endpoint restringido a SUPER_ADMIN para recibir subidas de PDFs (Manuales de fabricantes mecánicos).
- Integración con Anthropic Claude API (usando prompt especializado para JSON output: intervalos, items, número de partes).
- Pantalla temporal o sección en UI Admin para revisar el resultado propuesto (MasterParts, frecuencias y items).
- Persistencia de estos componentes en DB con `tenantId` `null` (Global).

### Out of Scope
- Escaneo generalizado de facturas de compras o facturas externas de los tenants (esta tarea se abordará post-KB, aunque la tecnología se pueda reciclar).
- Extracción automatizada sin revisión humana (siempre es el SUPER_ADMIN quien debe aprobar la propuesta de la IA).

## Approach

Desarrollar un flujo simple donde:
1. Se sube un archivo (FormData) al panel SUPER_ADMIN.
2. Un endpoint en `/api/admin/kb/import-manual/` envía las imágenes/documentos a Claude 3/3.5 Vision con un 'system prompt' estricto enfocado al JSON de mantenimiento.
3. Se devuelve el esquema estructurado al cliente para mostrar una UI interactiva donde el administrador ajusta partes que pudieran tener error tipográfico.
4. Tras 'Confirmar', se insertan registros iterativos (MantItems y vinculaciones a MasterParts).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/admin/kb/import-manual/route.ts` | New | Endpoint API que procesa imagen/PDF a la API de AI |
| `src/app/admin/kb-population/page.tsx` | New | Vista UI para subir el archivo y validar la data extraída |
| `src/lib/services/ai-vision.ts` | New | Lógica para dialogar con Anthropic / Claude |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Timeouts en API/Vercel superior a 10s al procesar PDFs largos | High | Limitar cantidad de PDFs páginas por query o usar función de step async. |
| Falsos positivos (IA confunde modelos) | Medium | Validar con UI obligatoria. NUNCA autoguardar resultados ciegamente en base de datos de producción. |

## Rollback Plan

- Si se aprueban items erróneos en la base de datos global, se agregará (o usará función actual) el Soft-Delete o Hard-Delete desde la interfaz SUPER_ADMIN filtrando por la última actualización.
- En código, revertir el commit de las interfaces y rutas nuevas es suficiente sin impacto negativo al inquilino (puesto que es SUPER_ADMIN route).

## Dependencies

- API key configurada de Anthropic (`ANTHROPIC_API_KEY_APP`)
- Acceso SUPER ADMIN funcional en el entorno de operaciones.

## Success Criteria

- [ ] Un usuario SUPER_ADMIN puede subir un PDF del manual de una camioneta Hilux y recibir una tabla interactiva con items ("Cambio Extracción aceite", "Filtro 90915") y kilómetros.
- [ ] Tras guardar, todos los _tenants_ pueden encontrar y hacer uso de esas operaciones estándar al registrar ese vehículo.
