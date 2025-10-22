# 🤖 Claude - Instrucciones de Inicio de Sesión

**IMPORTANTE**: Lee este archivo AL INICIO de CADA sesión antes de empezar a trabajar.

---

## 📋 PROTOCOLO DE INICIO

### 1. Leer estos 3 archivos (en orden):
```
1. /.claude/README.md (este archivo)
2. /.claude/roadmap/ROADMAP.md
3. /.claude/sessions/[ÚLTIMA_SESIÓN].md
```

### 2. Resumir al usuario:
- ✅ Última feature completada
- ⏳ Pendientes críticos (top 3)
- 📅 Qué toca hoy (según ROADMAP)

**Formato del resumen** (máximo 5 líneas):
```
Última sesión (DD-MMM): [Feature completada]
Pendiente hoy: [Tarea 1], [Tarea 2]
Estado sprint: [X% completado]
```

### 3. Preguntar:
> "¿Continuamos con [tarea pendiente] o hay algo más urgente?"

---

## 📚 ESTRUCTURA DE DOCUMENTACIÓN

```
.claude/
├── README.md                    ← EMPEZAR AQUÍ (este archivo)
├── roadmap/
│   └── ROADMAP.md              ← Estado general del proyecto
├── conversations/
│   ├── README.md               ← Índice de decisiones técnicas
│   └── [tema].md               ← Decisiones por feature
└── sessions/
    └── YYYY-MM-DD-[tema].md    ← Log detallado diario
```

---

## 🎯 PROYECTO: Fleet Care SaaS

### Contexto Rápido
- **Qué es**: SaaS B2B de gestión de mantenimiento de flotas vehiculares
- **Modelo**: Build to Sell (exit en 3 años por $400k-$1M)
- **Stack**: Next.js 14, Prisma, Supabase, TypeScript
- **Estado actual**: MVP en desarrollo (Q4 2025)

### Usuario (Fundador)
- Rol: Full-stack developer + fundador
- Estilo: Prefiere código incluido en documentación (ayuda a tomar decisiones)
- Memoria: Confía en documentación (no en su memoria)
- Expectativa: Claude debe ser proactivo pero no dar la razón en todo

---

## 📝 REGLAS DE DOCUMENTACIÓN

### Durante la Sesión

**Cuando tomar decisión técnica importante**:
→ Actualizar `conversations/[tema].md`

**Cuando completar/agregar tareas**:
→ Actualizar `ROADMAP.md`

**Al final de cada sesión**:
→ Crear/actualizar `sessions/YYYY-MM-DD-[tema].md`

### Estilo de Documentación

✅ **INCLUIR código relevante** (usuario lo valora para tomar decisiones)
✅ **Código clave**, no archivos completos
✅ **Decisiones + snippet que lo demuestra**
❌ NO archivos `.md` nuevos sin necesidad (EDITAR existentes)
❌ NO crear documentación proactivamente (solo si usuario pide)

---

## 🗂️ ARCHIVOS CLAVE POR TEMA

### Estado del Proyecto
- `roadmap/ROADMAP.md` - Documento maestro

### Decisiones Técnicas
- `conversations/README.md` - Índice
- `conversations/cv-vehiculos.md` - CV de vehículos
- (Agregar más según features)

### Visión Estratégica
- `sessions/Futuro del SaaS/2025-10-08-estrategia-build-to-sell-y-decisiones-vida.md`
- `sessions/Futuro del SaaS/2025-10-10-arquitectura-invoice-masterpart-estrategia.md`

### Última Sesión
- Buscar archivo más reciente en `/sessions/2025-*.md`

---

## 🎯 FEATURES CLAVE DEL PROYECTO

### ✅ Completadas (Q4 2025)
- Multi-tenancy + Autenticación
- CRUD Vehículos (marca, línea, tipo)
- Sistema de documentos (SOAT, Tecnomecánica, etc.)
- **Dashboard de alertas rediseñado** (20-Oct)
- **CV de vehículos con PDF + Email** (21-Oct)

### ⏳ En Progreso
- Configurar Resend (envío de emails)
- Testing CV por email

### 🔜 Pendientes Críticos
1. **Sistema de templates de mantenimiento** (diseñado, no implementado)
2. **Cierre de alertas via WorkOrders** (crítico para MVP)
3. **Sistema de programación de calendario** (diseñado)
4. **Invoice + MasterPart** (Post-MVP)

---

## 💡 DECISIONES ARQUITECTÓNICAS IMPORTANTES

### Generación de PDFs
- ✅ Usar: `@react-pdf/renderer` (server-side)
- ❌ Descartado: Puppeteer, jsPDF

### Envío de Emails
- ✅ Usar: Resend + React Email
- ❌ Descartado: SendGrid, AWS SES

### Documentos del Vehículo
- ✅ Tabla separada `Document` (no campos en `Vehicle`)
- ✅ Separar `fileName` (archivo) vs `documentNumber` (número oficial)

### Templates de Mantenimiento
- ✅ No usar `tenantId = NULL` para datos compartidos
- ✅ Tablas separadas: `OfficialMaintenanceTemplate` + `MaintenanceTemplate`

---

## 🔧 AMBIENTE TÉCNICO

### Bases de Datos (Supabase)
- **Development**: `fleet-care-develop` (qazrjmkfbjgdjfvfylqx)
- **Staging**: `fleet-care-staging` (rvenejfnqodzwpptxppk)
- **Production**: TBD

### Branches Git
- `main`: Producción
- `staging`: Staging (Vercel)
- `develop`: Desarrollo activo ✅

### Variables de Entorno Pendientes
```env
# Resend (para envío de emails)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com
```

---

## 🚨 RECORDATORIOS IMPORTANTES

### 1. Estilo de Comunicación
- ✅ Conciso y directo (CLI-friendly)
- ✅ Honesto (no dar la razón en todo)
- ✅ Proactivo cuando corresponde
- ❌ NO preambles innecesarios
- ❌ NO emojis (salvo que usuario pida)

### 2. Workflow con Usuario
- Usuario confía en ti como **compañero de equipo**
- Puedes (y debes) cuestionar decisiones si ves problemas
- Objetivo: Construir juntos, no solo ejecutar órdenes

### 3. Git y Commits
- Solo commitear cuando usuario lo pida explícitamente
- Usar mensajes descriptivos
- Incluir footer: "🤖 Generated with Claude Code"

---

## 📊 MÉTRICAS DE ÉXITO

### Para el Proyecto
- Llegar a 10-15 clientes beta (Q4 2025)
- MRR $1.5-4k/mes (Año 1)
- Exit exitoso $400k-$1M (2028)

### Para Esta Colaboración
- Usuario sabe dónde está parado (sin depender de su memoria)
- Decisiones documentadas (fácil de retomar semanas después)
- Código de calidad (mantenible para venta futura)

---

## 🎯 AL INICIO DE CADA SESIÓN

**TU checklist mental**:
1. ✅ Leí README.md (este archivo)
2. ✅ Leí ROADMAP.md (estado general)
3. ✅ Leí última sesión (contexto inmediato)
4. ✅ Resumí al usuario en ≤5 líneas
5. ✅ Pregunté qué toca hoy

**Solo entonces**: Empezar a trabajar

---

## 📞 COMANDOS RÁPIDOS PARA EL USUARIO

Para que el usuario te diga al inicio:

```bash
# Opción 1: Simple
"Lee el README de .claude"

# Opción 2: Completa
"Lee README + ROADMAP + última sesión"

# Opción 3: Ultra rápida
"Contexto"
```

Cualquiera de esos → Tú sabes qué hacer.

---

**Última actualización**: 21 Octubre 2025
**Versión**: 1.0
**Próxima revisión**: Cuando cambie algo importante en estructura o workflow
