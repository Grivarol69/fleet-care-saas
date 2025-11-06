# 🔑 CÓMO OBTENER CREDENCIALES CORRECTAS DE SUPABASE

## 🚨 PROBLEMA DETECTADO

Error: `FATAL: Tenant or user not found`

Esto significa que las credenciales en tu `.env` NO coinciden con las de Supabase.

---

## 📋 PASOS PARA OBTENER CREDENCIALES CORRECTAS

### 1. Ir a Supabase Dashboard

1. Abrir: https://supabase.com/dashboard
2. Loguearte
3. Seleccionar proyecto: `fleet-care-staging` (o el que uses)

---

### 2. Ir a Settings → Database

1. En el menú izquierdo: **Settings** (⚙️)
2. Seleccionar: **Database**
3. Hacer scroll hasta **Connection string**

---

### 3. Copiar Connection Pooling URL

Verás algo como esto:

```
┌─────────────────────────────────────────────────────────────┐
│ Connection Pooling                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Mode: Transaction  ▼                                        │
│                                                             │
│ URI:                                                        │
│ postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@       │
│ aws-0-us-east-1.pooler.supabase.com:6543/postgres         │
│                                                             │
│ [Copy] [Show password]                                      │
└─────────────────────────────────────────────────────────────┘
```

**IMPORTANTE**:
- Clic en **"Show password"** para ver el password real
- Copiar la URL COMPLETA

---

### 4. Obtener TAMBIÉN la Direct Connection

Scroll más abajo hasta:

```
┌─────────────────────────────────────────────────────────────┐
│ Connection string                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ URI:                                                        │
│ postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@       │
│ db.[PROJECT_REF].supabase.co:5432/postgres                │
│                                                             │
│ [Copy]                                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. PEGAR AQUÍ LAS URLs REALES

Una vez copiadas, ejecuta:

```bash
cd /home/grivarol69/Escritorio/Desarrollo\ Web/fleet-care-saas

# Crear archivo temporal con las URLs correctas
nano test-urls.txt
```

Pegar:
```
# Connection Pooling (Transaction Mode)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-X-us-east-X.pooler.supabase.com:6543/postgres?pgbouncer=true

# Connection Pooling (Session Mode)
SESSION_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-X-us-east-X.pooler.supabase.com:5432/postgres?pgbouncer=true

# Direct Connection
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

Guardar (Ctrl+O, Enter, Ctrl+X)

---

## 6. PROBAR LAS URLs REALES

```bash
# Extraer las URLs
export DATABASE_URL=$(grep "^DATABASE_URL=" test-urls.txt | cut -d= -f2-)
export SESSION_URL=$(grep "^SESSION_URL=" test-urls.txt | cut -d= -f2-)
export DIRECT_URL=$(grep "^DIRECT_URL=" test-urls.txt | cut -d= -f2-)

# Test 1: Pooled Transaction
echo "Testing DATABASE_URL..."
DATABASE_URL="$DATABASE_URL" npx tsx scripts/test-fix-credentials.ts

# Test 2: Pooled Session
echo "Testing SESSION_URL..."
DATABASE_URL="$SESSION_URL" npx tsx scripts/test-fix-credentials.ts

# Test 3: Direct
echo "Testing DIRECT_URL..."
DATABASE_URL="$DIRECT_URL" npx tsx scripts/test-fix-credentials.ts
```

---

## 7. SI NINGUNA FUNCIONA

### Opción A: Reset Password en Supabase

1. Ir a **Settings → Database**
2. Buscar sección **Database Password**
3. Clic en **Reset Database Password**
4. Copiar el NUEVO password
5. Actualizar las URLs con el nuevo password
6. Probar de nuevo

---

### Opción B: Verificar que el Proyecto está ACTIVO

1. Ir a **Settings → General**
2. Verificar **Project Status**: debe decir "Active"
3. Si dice "Paused", hacer clic en **Restore**

---

### Opción C: Verificar IP Allowlist

1. Ir a **Settings → Database**
2. Scroll hasta **Network Restrictions**
3. Verificar que tu IP esté permitida:
   - **Opción 1**: Agregar tu IP actual
   - **Opción 2**: Deshabilitar restricciones (solo desarrollo): `0.0.0.0/0`

Para ver tu IP actual:
```bash
curl -4 ifconfig.me
```

---

## 8. ACTUALIZAR .env CON LA URL QUE FUNCIONÓ

Una vez que UNA de las URLs funcione, actualizar `.env`:

```bash
# Backup del .env actual
cp .env .env.backup.$(date +%Y%m%d-%H%M%S)

# Editar .env
nano .env
```

Reemplazar las líneas:
```bash
DATABASE_URL="[URL_QUE_FUNCIONÓ]"
DIRECT_URL="[URL_DIRECTA_QUE_FUNCIONÓ]"
```

Guardar y probar:
```bash
npx prisma migrate status
```

---

## 📊 FORMATO CORRECTO DE URLs SUPABASE

### Pooled Transaction Mode (Runtime - Vercel)
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-X-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### Pooled Session Mode (Migraciones)
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-X-region.pooler.supabase.com:5432/postgres?pgbouncer=true
```

### Direct Connection (Alternativa)
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

**Donde**:
- `[PROJECT_REF]` = ID del proyecto (ej: `rvenejfnqodzwpptxppk`)
- `[PASSWORD]` = Password de la base de datos (NO es tu password de Supabase login)
- `aws-X-region` = Región del proyecto (ej: `aws-1-us-east-2`, `aws-0-us-east-1`)

---

## 🎯 SIGUIENTE PASO

Una vez obtengas las URLs correctas del Dashboard, pégalas aquí para que yo las pruebe con el script de diagnóstico.

**O MEJOR AÚN**: Toma una screenshot de:
1. Settings → Database → Connection Pooling (con password visible)
2. Settings → Database → Connection string

Y compártela (asegúrate de ocultar el password antes de compartir con cualquier otra persona).
