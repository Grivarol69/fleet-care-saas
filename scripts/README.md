# Scripts de Gestión de Ambientes - Fleet Care

## 📋 Índice

- [Scripts Disponibles](#scripts-disponibles)
- [Guía Rápida](#guía-rápida)
- [Seguridad y Protecciones](#seguridad-y-protecciones)
- [Casos de Uso Comunes](#casos-de-uso-comunes)
- [Solución de Problemas](#solución-de-problemas)

---

## 🛠️ Scripts Disponibles

### 1. `check-env.sh` - Verificar Ambiente Actual

**¿Qué hace?**
- Detecta automáticamente en qué ambiente estás trabajando
- Valida que todas las variables de entorno estén configuradas
- Muestra información de la base de datos actual
- Lista backups disponibles

**¿Cuándo usarlo?**
- Antes de hacer cualquier cambio importante
- Cuando no estés seguro en qué ambiente estás
- Para verificar que tu configuración es correcta

**Uso:**
```bash
./scripts/check-env.sh
```

**Ejemplo de salida:**
```
========================================
Fleet Care - Environment Check
========================================

📋 Ambiente Detectado:

  🟢 Ambiente: DEVELOPMENT

🌐 Configuración de Aplicación:

  App URL:     http://localhost:3000
  Domain:      localhost:3000
  Environment: development

🗄️  Base de Datos (Supabase):

  Proyecto ID: abc123xyz456
  📍 DEVELOPMENT DATABASE

✓ Validación de Variables:

  ✓ DATABASE_URL
  ✓ DIRECT_URL
  ✓ NEXT_PUBLIC_SUPABASE_URL
  ...

========================================
✅ Configuración completa y válida
========================================
```

---

### 2. `env-switch.sh` - Cambiar Entre Ambientes

**¿Qué hace?**
- Cambia tu `.env` al ambiente especificado (development, staging, production)
- Crea backups automáticos con timestamp
- Valida que el cambio se aplicó correctamente
- Protección especial para producción (confirmación doble)

**¿Cuándo usarlo?**
- Cuando necesitas trabajar en un ambiente diferente
- Para probar algo en staging localmente
- Nunca para producción (usar Vercel directamente)

**Uso:**
```bash
# Cambiar a development
./scripts/env-switch.sh development

# Cambiar a staging
./scripts/env-switch.sh staging

# Cambiar a production (requiere confirmación especial)
./scripts/env-switch.sh production
```

**Flujo del script:**

1. **Detecta ambiente actual**
```
📋 Estado Actual:

  Ambiente actual:  development
  Ambiente destino: staging
```

2. **Valida ambiente destino**
```
🔍 Validando ambiente destino...

  Proyecto Supabase: rvenejfnqodzwpptxppk
  App URL:           https://staging-fleetcare.vercel.app
```

3. **Pide confirmación**
```
⚠️  ¿Deseas cambiar al ambiente: staging?

Se creará un backup automático de tu .env actual

Confirmar (yes/no):
```

4. **Crea backups**
```
📦 Creando backup de .env actual...
✓ Backup creado: .env.backup.development.20251017_152030
✓ Backup rápido: .env.backup
```

5. **Aplica el cambio y verifica**
```
🔄 Aplicando cambio...
✓ Archivo .env actualizado

========================================
✅ Cambio de ambiente completado
========================================

  Ambiente anterior: development
  Ambiente actual:   staging
```

**Protección para Producción:**
```
╔════════════════════════════════════════╗
║  ⚠️  ADVERTENCIA CRÍTICA - PRODUCCIÓN  ║
╚════════════════════════════════════════╝

Estás a punto de cambiar a PRODUCCIÓN
Esto afectará DATOS REALES de CLIENTES

Escribe exactamente: CAMBIAR A PRODUCCION
>
```

---

### 3. `seed-staging.sh` - Ejecutar Seed en Staging

**¿Qué hace?**
- Ejecuta `npm run db:seed` en la base de datos de staging
- Cambia temporalmente tu `.env` a staging
- Restaura tu `.env` original después (siempre, incluso si falla)
- Bloquea ejecución si estás en producción

**¿Cuándo usarlo?**
- Cuando staging no tiene datos
- Después de hacer un reset de la base de datos de staging
- Para repoblar staging con datos de prueba

**Uso:**
```bash
./scripts/seed-staging.sh
```

**Flujo del script:**

1. **Detecta ambiente y valida**
```
📋 Estado Actual:

  Ambiente actual: development
  Ambiente destino: staging

🔍 Información de Staging:

  Proyecto Supabase: rvenejfnqodzwpptxppk
  App URL:           https://staging-fleetcare.vercel.app
```

2. **Muestra advertencia**
```
╔════════════════════════════════════════╗
║    ⚠️  ADVERTENCIA - SEED EN STAGING   ║
╚════════════════════════════════════════╝

Esta operación hará lo siguiente:

  1. Backup de tu .env actual
  2. Cambiar temporalmente a .env.staging
  3. Ejecutar: npm run db:seed
  4. Restaurar tu .env original

⚠️  IMPORTANTE:
  - Esto puede sobrescribir datos existentes en staging
  - Solo afecta la BD de staging (rvenejfnqodzwpptxppk)
  - Tu ambiente local NO se verá afectado

¿Deseas continuar? (yes/no):
```

3. **Ejecuta seed de forma segura**
```
📦 Creando backup de .env actual...
✓ Backup creado: .env.backup.development.20251017_152100

🔄 Cambiando temporalmente a staging...
✓ Usando .env.staging

🔍 Verificando conexión a BD de staging...
✓ Conexión exitosa a staging

🌱 Ejecutando seed en staging...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Output del seed aquí]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Restaurando .env original...
✓ .env restaurado

========================================
✅ Seed en staging completado exitosamente
========================================
```

**Si estás en producción (BLOQUEADO):**
```
╔════════════════════════════════════════╗
║   ❌ BLOQUEADO - ESTÁS EN PRODUCCIÓN   ║
╚════════════════════════════════════════╝

NO puedes correr seed desde producción
Cambia primero a development:
  ./scripts/env-switch.sh development
```

---

## 🔒 Seguridad y Protecciones

### Protecciones Implementadas

#### 1. **Detección Automática de Ambiente**
Los scripts detectan automáticamente en qué ambiente estás trabajando basándose en las URLs de Supabase:

- `rvenejfnqodzwpptxppk` → **Staging**
- `localhost` o vacío → **Development**
- `fleetcare.com` → **Production**

#### 2. **Backups Automáticos con Timestamp**
Cada vez que cambias de ambiente, se crean 2 backups:

- `.env.backup` - Backup rápido (sobrescribe el anterior)
- `.env.backup.{ambiente}.{timestamp}` - Backup permanente con fecha y hora

Ejemplo: `.env.backup.development.20251017_152030`

**Nunca pierdes un backup anterior** porque cada uno tiene timestamp único.

#### 3. **Validación Post-Cambio**
Después de cambiar el `.env`, el script verifica que el cambio se aplicó correctamente.
Si algo sale mal, restaura automáticamente el backup.

#### 4. **Protección para Producción**
- **Confirmación especial**: Debes escribir exactamente `CAMBIAR A PRODUCCION`
- **Bloqueo de seed**: No puedes correr seed si estás en producción
- **Advertencias visuales**: Mensajes en rojo y marcos llamativos

#### 5. **Restauración Garantizada**
En `seed-staging.sh`, el `.env` original se restaura **SIEMPRE**:
- Si el seed es exitoso → restaura
- Si el seed falla → restaura
- Si pierdes conexión → restaura

---

## 🎯 Casos de Uso Comunes

### Caso 1: Verificar en qué ambiente estoy

```bash
./scripts/check-env.sh
```

### Caso 2: Cambiar a staging para depurar

```bash
# 1. Ver ambiente actual
./scripts/check-env.sh

# 2. Cambiar a staging
./scripts/env-switch.sh staging

# 3. Trabajar en staging
npm run prisma:studio  # Ver BD de staging

# 4. Volver a development
./scripts/env-switch.sh development
```

### Caso 3: Staging no tiene datos después de deploy

```bash
# Opción más segura: usar el script
./scripts/seed-staging.sh

# Verás:
# ✓ Backup automático
# ✓ Seed en staging
# ✓ Restauración automática de .env
```

### Caso 4: Quiero probar algo en la BD de staging localmente

```bash
# 1. Cambiar a staging
./scripts/env-switch.sh staging

# 2. Trabajar con la BD de staging
npm run dev  # App conectada a staging
npm run prisma:studio  # Ver BD de staging

# 3. Volver a development cuando termines
./scripts/env-switch.sh development
```

### Caso 5: Restaurar un backup después de un error

```bash
# Ver backups disponibles
./scripts/check-env.sh

# Restaurar el último backup
cp .env.backup .env

# O restaurar un backup específico
cp .env.backup.development.20251017_152030 .env
```

---

## 🆘 Solución de Problemas

### Problema: "Error: Archivo .env.local no encontrado"

**Causa**: No has creado tu archivo de desarrollo local.

**Solución**:
```bash
# Crear desde el template
cp .env.example .env.local

# Editar con tus credenciales de development
nano .env.local
```

---

### Problema: "No se pudo conectar a la base de datos"

**Causa**: Variables de base de datos incorrectas o BD inaccesible.

**Solución**:
```bash
# 1. Verificar configuración
./scripts/check-env.sh

# 2. Verificar que DATABASE_URL y DIRECT_URL son correctas
# 3. Verificar que el proyecto de Supabase está activo
```

---

### Problema: "El seed falló en staging"

**Causa**: Puede ser un error en el seed, schema desactualizado, o conexión perdida.

**Qué hace el script**:
- ✅ Restaura tu `.env` original automáticamente
- ✅ Tu ambiente local NO se ve afectado

**Solución**:
```bash
# 1. Verificar que las migraciones están aplicadas en staging
./scripts/env-switch.sh staging
npx prisma migrate deploy
./scripts/env-switch.sh development

# 2. Intentar seed nuevamente
./scripts/seed-staging.sh
```

---

### Problema: "Ya cambié de ambiente pero la app sigue usando el anterior"

**Causa**: Next.js cachea las variables de entorno.

**Solución**:
```bash
# Reinicia el servidor de desarrollo
npm run dev
```

---

### Problema: "Quiero ver qué BD estoy usando AHORA"

**Solución**:
```bash
./scripts/check-env.sh

# Verás claramente:
# 🟢 Ambiente: DEVELOPMENT
# 🗄️  Proyecto Supabase: abc123xyz456
```

---

## 📚 Recursos Adicionales

### Archivos Importantes

- `.env.example` - Template de variables de entorno
- `.env.local` - Development local (crear desde .env.example)
- `.env.staging` - Staging (YA EXISTE en el repo)
- `.env.production` - Production (crear cuando sea necesario)

### Documentación Completa

Ver: `.claude/sessions/2025-10-17-estrategia-ambientes-bases-datos.md`

Incluye:
- Arquitectura completa de ambientes
- Guía paso a paso para configurar cada ambiente
- Estrategia de bases de datos
- Configuración de Vercel
- Mejores prácticas

---

## ⚠️ Reglas de Oro

### ✅ HACER:

1. **Siempre verificar el ambiente antes de cambios importantes**
   ```bash
   ./scripts/check-env.sh
   ```

2. **Usar los scripts para cambiar de ambiente**
   ```bash
   ./scripts/env-switch.sh [ambiente]
   ```

3. **Correr seed en staging usando el script**
   ```bash
   ./scripts/seed-staging.sh
   ```

4. **Mantener backups de .env importantes**
   - Los scripts crean backups automáticos
   - Guarda manualmente backups de configuraciones importantes

### ❌ NO HACER:

1. **NO editar `.env` manualmente para cambiar de ambiente**
   - Usa `./scripts/env-switch.sh`

2. **NO correr seed directamente si necesitas cambiar de ambiente**
   - Usa `./scripts/seed-staging.sh`

3. **NO trabajar en producción desde local**
   - Usa Vercel Dashboard para cambios en producción

4. **NO commitear archivos `.env` con credenciales reales**
   - Están en `.gitignore`
   - Solo `.env.example` debe estar en git

---

## 🚀 Workflow Recomendado

### Día a día (Development)

```bash
# Mañana
./scripts/check-env.sh        # Verificar que estoy en development
npm run dev                    # Trabajar normalmente

# Si necesito datos frescos
npm run db:seed
```

### Trabajar con Staging

```bash
# Cuando necesito probar en staging
./scripts/env-switch.sh staging
npm run dev                    # Conectado a staging

# Cuando termino
./scripts/env-switch.sh development
```

### Poblar Staging con Datos

```bash
# Asegurarme de estar en development
./scripts/check-env.sh

# Correr seed en staging de forma segura
./scripts/seed-staging.sh

# Verificar en Supabase Dashboard
# https://supabase.com/dashboard/project/rvenejfnqodzwpptxppk
```

---

## 📞 Ayuda

Si tienes problemas:

1. **Verifica tu ambiente actual**: `./scripts/check-env.sh`
2. **Revisa la documentación completa**: `.claude/sessions/2025-10-17-estrategia-ambientes-bases-datos.md`
3. **Restaura un backup si algo salió mal**: `cp .env.backup .env`

---

**Última actualización**: 17 Octubre 2025
**Versión de scripts**: 1.0.0
