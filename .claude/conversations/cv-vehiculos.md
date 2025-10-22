# 🚗 CV de Vehículos - Decisiones Técnicas

**Fecha**: 21 Octubre 2025
**Feature**: Generación y envío de CV (Hoja de Vida) de vehículos por email
**Estado**: ✅ Implementado (MVP), pendiente configurar Resend

---

## 📋 Contexto

El cliente necesita enviar por email la "Hoja de Vida" completa de cada vehículo, incluyendo:
- Datos técnicos (marca, modelo, motor, chasis, etc.)
- Foto del vehículo
- Documentos legales (SOAT, Tecnomecánica, Póliza) con números y vencimientos
- Contacto de emergencia

**Formato base**: Excel proporcionado por el cliente (imagen de referencia)

---

## 🎯 Decisión 1: Librería para Generación de PDFs

### Opciones Evaluadas

#### ❌ Opción A: HTML to PDF (Puppeteer, html2canvas)
```typescript
// Renderizar HTML y convertir a PDF
await page.pdf({ path: 'cv.pdf' })
```
**Descartado por**:
- Muy pesado (requiere Chromium completo)
- Inconsistencias de renderizado
- No funciona bien en serverless
- Difícil de depurar

#### ❌ Opción B: jsPDF
```javascript
const doc = new jsPDF()
doc.text('Hello', 10, 10)
```
**Descartado por**:
- API de bajo nivel (tedioso)
- Layout manual complicado
- No soporta componentes React

#### ✅ Opción C: @react-pdf/renderer (ELEGIDA)
```tsx
import { Document, Page, Text, View } from '@react-pdf/renderer'

const VehicleCV = () => (
  <Document>
    <Page size="A4">
      <View style={styles.header}>
        <Text>HOJA DE VIDA DE VEHICULO</Text>
      </View>
    </Page>
  </Document>
)
```

### Por qué elegimos @react-pdf/renderer

**Ventajas**:
- ✅ Componentes React nativos (misma sintaxis que ya conocemos)
- ✅ Precisión de layout (no depende de browser rendering)
- ✅ Compatible con SSR (server-side rendering en Next.js)
- ✅ Tamaño de archivo PDF optimizado
- ✅ Performance superior
- ✅ Estilos con objetos JavaScript (familiar)

**Trade-offs**:
- ⚠️ Curva de aprendizaje inicial (sintaxis de estilos diferente a CSS normal)
- ⚠️ No soporta todas las propiedades CSS (ej: border debe ser string `"1px solid #000"`)

**Archivos creados**:
- `src/app/dashboard/vehicles/fleet/components/VehicleCV/VehicleCV.tsx`
- `src/app/dashboard/vehicles/fleet/components/VehicleCV/VehicleCVViewer.tsx`

---

## 🎯 Decisión 2: Servicio de Envío de Emails

### Opciones Evaluadas

#### ❌ Opción A: SendGrid
**Descartado por**:
- UI anticuada y confusa
- API compleja para casos simples
- Pricing menos claro

#### ❌ Opción B: AWS SES
**Descartado por**:
- Setup inicial complicado (IAM, credenciales, etc.)
- Pricing difícil de predecir
- DX (developer experience) pobre

#### ❌ Opción C: Nodemailer (SMTP propio)
**Descartado por**:
- Requiere configurar servidor SMTP
- Deliverability no garantizada
- Más complejidad de mantenimiento

#### ✅ Opción D: Resend (ELEGIDA)
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'noreply@fleetcare.com',
  to: ['cliente@example.com'],
  subject: 'CV del Vehículo ABC-123',
  react: VehicleCVEmail({ vehiclePlate: 'ABC-123' }),
  attachments: [{ filename: 'CV.pdf', content: pdfBuffer }]
})
```

### Por qué elegimos Resend

**Ventajas**:
- ✅ API moderna y simple
- ✅ React Email integration nativa (templates en React)
- ✅ 100 emails/día gratis (suficiente para MVP)
- ✅ Diseñado específicamente para Next.js
- ✅ Mejor DX del mercado
- ✅ Tracking de emails incluido
- ✅ Buena deliverability por defecto

**Pricing** (para cuando escale):
- Gratis: 100 emails/día, 3k/mes
- $20/mes: 50k emails/mes

**Archivos creados**:
- `src/emails/VehicleCVEmail.tsx`
- `src/app/api/vehicles/send-cv/route.ts`

---

## 🎯 Decisión 3: ¿Dónde Generar el PDF?

### Opciones Evaluadas

#### ❌ Opción A: Cliente (navegador)
```typescript
// En el componente React
const handleDownload = () => {
  const blob = pdf(<VehicleCV />).toBlob()
  saveAs(blob, 'cv.pdf')
}
```
**Descartado por**:
- Expone datos sensibles al cliente
- Más lento (browser vs Node.js)
- Mayor carga en el navegador del usuario
- Dificulta adjuntar al email (requiere upload extra)

#### ✅ Opción B: Servidor (API route) - ELEGIDA
```typescript
// src/app/api/vehicles/send-cv/route.ts
import { renderToBuffer } from '@react-pdf/renderer'

const pdfBuffer = await renderToBuffer(
  React.createElement(VehicleCV, { vehicle, tenant, documents })
)

// Adjuntar directo al email
await resend.emails.send({
  attachments: [{ content: pdfBuffer }]
})
```

### Por qué elegimos generación server-side

**Ventajas**:
- ✅ No expone datos del tenant/documentos al cliente
- ✅ Más rápido (Node.js performance)
- ✅ Menos carga en navegador del usuario
- ✅ Adjuntar PDF directo a email sin pasos extra
- ✅ Auditoría centralizada
- ✅ Validación de permisos (tenantId)

**Trade-offs**:
- ⚠️ Requiere endpoint API adicional
- ⚠️ Consumo de memoria en servidor (manejable con buffers)

**Cliente se usa solo para**: Vista previa (`VehicleCVViewer`)

---

## 🎯 Decisión 4: Adjuntar Documentos del Vehículo

### Contexto
Los clientes del usuario envían un paquete completo: CV + SOAT + Tecnomecánica + Póliza

### Opciones Evaluadas

#### Opción A: Adjuntos Separados (ELEGIDA para MVP)
```typescript
const attachments = [
  { filename: 'CV_ABC-123.pdf', content: cvBuffer },
  { filename: 'SOAT_ABC-123.pdf', content: soatBuffer },
  { filename: 'Tecnomecanica_ABC-123.pdf', content: tecnoBuffer },
  { filename: 'Poliza_ABC-123.pdf', content: polizaBuffer },
]

await resend.emails.send({ attachments })
```

**Ventajas**:
- ✅ Implementación simple
- ✅ Cada documento se puede abrir por separado
- ✅ Mejor organización para el destinatario
- ✅ Si falla la descarga de un documento, el resto se envía igual

**Trade-offs**:
- ⚠️ Múltiples archivos adjuntos (más espacio)

#### Opción B: Mergear todos en un solo PDF (Post-MVP)
Usando `pdf-lib` para combinar PDFs.

**Razón para no hacerlo ahora**:
- Más complejidad
- Si los clientes insisten, lo implementamos después
- Para MVP, adjuntos separados es suficiente

**Decisión**: Opción A para MVP, Opción B si clientes lo requieren

---

## 📦 Implementación Final

### Estructura de Archivos

```
src/
├── app/
│   ├── api/
│   │   └── vehicles/
│   │       └── send-cv/
│   │           └── route.ts              # Endpoint de envío
│   └── dashboard/
│       └── vehicles/
│           └── fleet/
│               └── components/
│                   ├── VehicleCV/
│                   │   ├── VehicleCV.tsx       # Generador PDF
│                   │   └── VehicleCVViewer.tsx # Modal preview
│                   ├── SendCVDialog/
│                   │   └── SendCVDialog.tsx    # Formulario email
│                   └── FleetVehiclesList/
│                       └── FleetVehiclesList.tsx # DropdownMenu
└── emails/
    └── VehicleCVEmail.tsx                # Template de email
```

### Flujo Completo

1. **Usuario hace click** en DropdownMenu → "Enviar por Email"
2. **Se abre SendCVDialog** → Ingresa email destinatario
3. **POST a /api/vehicles/send-cv**:
   ```typescript
   { vehicleId: 123, recipientEmail: "cliente@example.com" }
   ```
4. **Endpoint procesa**:
   - Valida autenticación (tenantId)
   - Query vehículo + documentos activos
   - Genera CV.pdf con `renderToBuffer()`
   - Descarga documentos (SOAT, etc.) desde `fileUrl`
   - Prepara attachments array
5. **Resend envía email** con:
   - Template React (VehicleCVEmail)
   - Attachments: CV + documentos
6. **Usuario recibe toast** de confirmación

### Código Clave: Descarga de Documentos

```typescript
// src/app/api/vehicles/send-cv/route.ts

const attachments = [
  { filename: 'CV_ABC-123_2025-10-21.pdf', content: pdfBuffer }
]

// Descargar y adjuntar documentos activos del vehículo
for (const doc of vehicle.documents) {
  try {
    if (!doc.fileUrl) continue

    const response = await fetch(doc.fileUrl)
    if (!response.ok) continue

    const buffer = Buffer.from(await response.arrayBuffer())

    const docTypeNames = {
      SOAT: 'SOAT',
      TECNOMECANICA: 'Tecnomecanica',
      INSURANCE: 'Poliza',
      PROPERTY_CARD: 'Tarjeta_Propiedad',
    }

    const docTypeName = docTypeNames[doc.type] || 'Documento'
    const extension = doc.fileUrl.split('.').pop() || 'pdf'

    attachments.push({
      filename: `${docTypeName}_${vehicle.licensePlate}.${extension}`,
      content: buffer
    })
  } catch (error) {
    console.error(`Error downloading document ${doc.id}:`, error)
    // Continuar con los demás documentos aunque uno falle
  }
}
```

**Resiliente**: Si falla la descarga de un documento, continúa con los demás.

---

## 🎨 UX Considerations

### Modal de Preview
- Tamaño: 95vw x 95vh (usa casi toda la pantalla)
- PDFViewer con toolbar activado
- Botón "Descargar PDF" siempre visible
- Loading state mientras carga

### DropdownMenu
- Iconos claros (FileText, Mail, MessageCircle)
- WhatsApp visible pero disabled (preparado para Post-MVP)
- Separadores para agrupar acciones

### Nombres de Archivos
Descriptivos y con fecha:
- `CV_ABC-123_2025-10-21.pdf`
- `SOAT_ABC-123.pdf`
- `Tecnomecanica_ABC-123.pdf`

---

## ⚙️ Configuración Necesaria

### Variables de Entorno
```env
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com  # Debe estar verificado en Resend
```

### Pasos Setup Resend
1. Crear cuenta en https://resend.com (gratis)
2. Verificar dominio o usar dominio de prueba
3. Crear API key
4. Agregar a `.env.local`

---

## 🐛 Problemas Encontrados y Soluciones

### 1. Error: "Invalid border style: 1"
**Problema**:
```typescript
border: 1,           // ❌ Error
borderColor: "#000"
```

**Solución**:
```typescript
border: "1px solid #000000"  // ✅ Correcto
```

**Razón**: @react-pdf/renderer requiere border como string completo, no como número.

### 2. Columnas faltantes en BD
**Problema**: `fuelType`, `serviceType`, etc. no existían en BD aunque estaban en schema.

**Causa**: Migración marcada como aplicada pero no ejecutada realmente (pgbouncer caching).

**Solución**: Ejecutar SQL manual en Supabase con bloques `DO $$ BEGIN ... EXCEPTION` para manejar columnas duplicadas.

---

## 📊 Resultado Final

### Funcionalidad Implementada
- ✅ Generación de CV profesional en PDF
- ✅ Preview en modal antes de descargar
- ✅ Descarga local del PDF
- ✅ Envío por email con template personalizado
- ✅ Adjuntar documentos del vehículo automáticamente
- ✅ Nombres descriptivos para archivos
- ✅ Manejo de errores resiliente

### Pendiente
- [ ] Configurar Resend en desarrollo
- [ ] Probar envío real de emails
- [ ] Configurar Resend en staging/producción
- [ ] Deploy

### Post-MVP
- [ ] Mergear PDFs en un solo archivo (si clientes lo requieren)
- [ ] Envío por WhatsApp (infraestructura Twilio ya existe)
- [ ] Personalización de template de CV por tenant
- [ ] Historial de emails enviados

---

## 💡 Lecciones Aprendidas

1. **@react-pdf/renderer es excelente** pero hay que leer bien la documentación de estilos (no es CSS puro)
2. **Resend es la mejor opción** para emails en Next.js - setup en 5 minutos
3. **Generación server-side** es más segura y rápida que cliente
4. **Adjuntos separados** son más simples y suficientes para MVP
5. **Siempre manejar errores** al descargar archivos externos (fetch puede fallar)

---

**Archivos totales**: 7 nuevos, 3 modificados
**Tiempo de implementación**: ~3 horas
**Complejidad**: Media
**Valor para usuario**: ⭐⭐⭐⭐⭐ (Killer Feature)
