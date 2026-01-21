# 🔧 DIAGNÓSTICO CONEXIÓN PRISMA-SUPABASE

## 📋 Scripts Disponibles

### 1. Test Completo de Conexiones
**Archivo**: `scripts/test-db-connections.ts`

**Qué hace**:
- Prueba 5 configuraciones diferentes de conexión
- Valida queries simples, complejas, transacciones
- Detecta problemas con prepared statements (pgbouncer)
- Genera reporte completo

**Cómo ejecutar**:
```bash
# Asegurar que tienes tsx instalado
npm install -D tsx

# Ejecutar diagnóstico completo (toma ~2-3 minutos)
npx tsx scripts/test-db-connections.ts

# O si prefieres guardar output
npx tsx scripts/test-db-connections.ts > diagnostico-$(date +%Y%m%d-%H%M%S).log 2>&1
```

**Output esperado**:
```
╔════════════════════════════════════════════════════════════╗
║     DIAGNÓSTICO DE CONEXIÓN PRISMA-SUPABASE              ║
╚════════════════════════════════════════════════════════════╝

Testeando: Pooled (Transaction Mode)
============================================================
URL: postgresql://postgres.rvenejfnq...***@...

1. Test conexión básica ($connect)...
✅ Conexión establecida

2. Test query simple (SELECT 1)...
✅ Query simple exitosa

...

RESUMEN DE RESULTADOS
━━━━━━━━━━━━━━━━━━━━━━━━

Pooled (Transaction Mode):
  Conexión:          ✅
  Query simple:      ✅
  Query compleja:    ✅
  Transacciones:     ✅
  Prepared Stmts:    ❌  ← Problema común con pgbouncer Transaction Mode

RECOMENDACIONES
━━━━━━━━━━━━━━━━

✅ 2 configuración(es) funcionando:
  - Pooled (Session Mode)
    Usar para migraciones: SÍ
    Usar para seed: SÍ
```

---

### 2. Test de Migraciones
**Archivo**: `scripts/test-migrate.sh`

**Qué hace**:
- Prueba 5 configuraciones diferentes específicamente para migraciones
- Ejecuta `prisma migrate status` con cada configuración
- Valida que puede leer el schema remoto
- NO hace cambios en la DB

**Cómo ejecutar**:
```bash
# Dar permisos de ejecución (solo primera vez)
chmod +x scripts/test-migrate.sh

# Ejecutar
bash scripts/test-migrate.sh

# O guardar log
bash scripts/test-migrate.sh 2>&1 | tee test-migrate-$(date +%Y%m%d).log
```

**Configuraciones que prueba**:
1. `Pooled Transaction + Pooled Session` (actual problema)
2. `Pooled Transaction + Direct 5432` (recomendado)
3. `Direct 5432 sin pooler` (alternativa)
4. `Direct via db.* host` (si no funciona pooler.supabase.com)
5. `Pooled con SSL` (si hay problemas de certificados)

**Output esperado**:
```
═══════════════════════════════════════════════════════════
CONFIG 1: Pooled (Transaction) + Pooled (Session)
═══════════════════════════════════════════════════════════

Testeando: Pooled Transaction + Pooled Session
============================================================
DATABASE_URL: postgresql://postgres.rvenejfnq...***@...
DIRECT_URL: postgresql://postgres.rvenejfnq...***@...

1. Probando 'prisma migrate status'...
✅ migrate status exitoso

Output:
Database schema is up to date!
```

---

### 3. Test de Seeds
**Archivo**: `scripts/test-seed.ts`

**Qué hace**:
- Simula operaciones típicas de un seed (upserts, transactions, batch inserts)
- Crea tenant de prueba + relaciones
- Valida cascade deletes
- Limpia todo al final

**Cómo ejecutar**:
```bash
# Con configuración específica
DATABASE_URL="postgresql://postgres.rvenejfnq...@...6543/postgres?pgbouncer=true" \
DIRECT_URL="postgresql://postgres.rvenejfnq...@...5432/postgres" \
npx tsx scripts/test-seed.ts

# O usar las URLs de tu .env actual
source .env && npx tsx scripts/test-seed.ts
```

**Output esperado**:
```
╔════════════════════════════════════════════════════════════╗
║            TEST DE OPERACIONES TIPO SEED                  ║
╚════════════════════════════════════════════════════════════╝

1. Conectando a DB...
✅ Conexión establecida

2. Query simple (SELECT)...
✅ Query exitosa

3. Crear tenant de prueba...
✅ Tenant creado: test-1730841234567

4. Transacción compleja (múltiples inserts)...
  - Brand creado
  - Type creado
  - Line creada
✅ Transacción exitosa

...

RESUMEN
━━━━━━━━━━━━━━━━━━━━━━━

✅ TODAS las operaciones tipo seed funcionaron correctamente
Esta configuración es APTA para seeds.
```

---

## 🎯 PLAN DE EJECUCIÓN RECOMENDADO

### Paso 1: Diagnóstico Completo
```bash
# Ejecutar test completo y guardar output
npx tsx scripts/test-db-connections.ts > diagnostico.log 2>&1

# Revisar qué configuraciones funcionaron
cat diagnostico.log | grep "✅"
```

### Paso 2: Identificar Configuración para Migraciones
```bash
# Ejecutar test de migraciones
bash scripts/test-migrate.sh > migrate-test.log 2>&1

# Ver cuál funcionó
cat migrate-test.log | grep "✅ migrate status exitoso" -B 5
```

### Paso 3: Validar Seeds
```bash
# Con la mejor configuración del paso 2, probar seeds
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." npx tsx scripts/test-seed.ts
```

### Paso 4: Actualizar .env
Una vez identificada la configuración que funciona, actualizar `.env`:

```bash
# Si funcionó CONFIG 2 (Pooled + Direct 5432)
DATABASE_URL="postgresql://postgres.rvenejfnqodzwpptxppk:etmcFKSW1984@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.rvenejfnqodzwpptxppk:etmcFKSW1984@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
```

---

## 🔍 INTERPRETACIÓN DE RESULTADOS

### Si TODO funciona ✅
```
Conexión:          ✅
Query simple:      ✅
Query compleja:    ✅
Transacciones:     ✅
Prepared Stmts:    ✅
```
→ **Usar esta configuración para DATABASE_URL y DIRECT_URL**

---

### Si falla Prepared Statements ❌
```
Conexión:          ✅
Query simple:      ✅
Query compleja:    ✅
Transacciones:     ✅
Prepared Stmts:    ❌  ← Problema con pgbouncer Transaction Mode
```
→ **Cambiar a Session Mode o Direct Connection**

Solución:
```bash
# Opción 1: Usar Session Mode (puerto 5432 en pooler)
DATABASE_URL="...pooler.supabase.com:5432/postgres?pgbouncer=true"

# Opción 2: Sin pooler
DATABASE_URL="...pooler.supabase.com:5432/postgres"

# Opción 3: Host directo
DATABASE_URL="...db.rvenejfnqodzwpptxppk.supabase.co:5432/postgres"
```

---

### Si falla TODO ❌
```
Conexión:          ❌
```
→ **Problema de red/firewall/credenciales**

**Checklist**:
1. ✅ Verificar que el proyecto Supabase esté **activo** (no pausado)
2. ✅ Verificar IP allowlist en Supabase Dashboard → Settings → Database
3. ✅ Verificar credenciales (password correcto)
4. ✅ Probar desde otra red (WiFi → 4G, o viceversa)
5. ✅ Verificar firewall local no bloquea puertos 5432/6543
6. ✅ Probar con VPN activada/desactivada

**Testing rápido de red**:
```bash
# Test puerto 6543 (pooler transaction)
nc -zv aws-1-us-east-2.pooler.supabase.com 6543

# Test puerto 5432 (pooler session / direct)
nc -zv aws-1-us-east-2.pooler.supabase.com 5432

# Test host directo
nc -zv db.rvenejfnqodzwpptxppk.supabase.co 5432
```

Si `nc` no está instalado:
```bash
# Ubuntu/Debian
sudo apt-get install netcat

# macOS
brew install netcat
```

---

## 🚨 ERRORES COMUNES Y SOLUCIONES

### Error: "prepared statement already exists"
**Causa**: pgbouncer en Transaction Mode no soporta prepared statements

**Solución**:
```bash
# Cambiar de Transaction Mode (6543) a Session Mode (5432)
DATABASE_URL="...pooler.supabase.com:5432/postgres?pgbouncer=true"
```

---

### Error: "timeout connecting to database"
**Causa**: Firewall, IP no autorizada, o proyecto pausado

**Solución**:
1. Verificar IP allowlist: Supabase Dashboard → Settings → Database → Connection Pooling
2. Agregar tu IP o usar `0.0.0.0/0` (solo desarrollo)
3. Verificar proyecto activo (puede pausarse por inactividad)

---

### Error: "password authentication failed"
**Causa**: Credenciales incorrectas

**Solución**:
1. Ir a Supabase Dashboard → Settings → Database
2. Copiar password (está oculta, hay que resetearla si no la recuerdas)
3. Actualizar `.env`

---

### Error: "Can't reach database server"
**Causa**: Host incorrecto o puerto bloqueado

**Solución**:
```bash
# Verificar host correcto
# pooler.supabase.com = Connection pooler ✅
# db.{project_id}.supabase.co = Direct connection ✅
# supabase.co (sin subdominio) = ❌ Incorrecto

# Verificar región correcta
# aws-1-us-east-2 = Norte Virginia (más común)
# aws-0-ap-southeast-1 = Singapur
# etc.
```

---

## 💡 RECOMENDACIONES FINALES

### Para DESARROLLO (local)
```bash
# Usar pooler Session Mode (mejor balance)
DATABASE_URL="postgresql://postgres.rvenejfnqodzwpptxppk:PASSWORD@aws-1-us-east-2.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.rvenejfnqodzwpptxppk:PASSWORD@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
```

### Para PRODUCCIÓN (Vercel)
```bash
# Runtime: Transaction Mode (mejor performance)
DATABASE_URL="postgresql://postgres.rvenejfnqodzwpptxppk:PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Migraciones: Session Mode o Direct
DIRECT_URL="postgresql://postgres.rvenejfnqodzwpptxppk:PASSWORD@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
```

---

## 📞 SI NADA FUNCIONA

Si después de ejecutar todos los tests **ninguna configuración funciona**, considera estas alternativas:

### Opción 1: Migrar a Supabase región diferente
- Crear nuevo proyecto en región más cercana
- Migrar schema con `prisma db push`
- Migrar datos con `pg_dump` / `pg_restore`

### Opción 2: Migrar a PlanetScale
- ✅ Sin problemas de pooler/prepared statements
- ✅ Branching de DB (como Git)
- ❌ Costo: $29/mes después de prueba
- Guía: https://www.prisma.io/docs/guides/database/planetscale

### Opción 3: Migrar a Railway.app
- ✅ PostgreSQL directo (sin pooler)
- ✅ $5/mes (más barato)
- ❌ Sin autenticación integrada (necesitas implementar tu auth)
- Guía: https://railway.app/

### Opción 4: Neon.tech (recomendado si migras)
- ✅ Serverless Postgres (como Supabase pero mejor pooler)
- ✅ Free tier generoso
- ✅ Branching de DB
- ✅ Compatible con Prisma
- Guía: https://neon.tech/docs/guides/prisma

---

## 📊 COMPARATIVA ALTERNATIVAS

| Provider | Costo | Pooler | Auth | Storage | Ventaja |
|----------|-------|--------|------|---------|---------|
| Supabase | Free-$25 | Problemático | ✅ | ✅ | All-in-one |
| PlanetScale | $0-$29 | Perfecto | ❌ | ❌ | DB Branching |
| Railway | $5 | No necesita | ❌ | ❌ | Simple |
| Neon | Free-$19 | Excelente | ❌ | ❌ | Serverless |
| Firebase | Free-$25 | N/A | ✅ | ✅ | NoSQL (no Prisma) |

---

## 🎯 PRÓXIMOS PASOS

1. **Ejecutar**: `npx tsx scripts/test-db-connections.ts`
2. **Revisar**: Output y identificar configuración que funciona
3. **Validar**: Con `test-migrate.sh` y `test-seed.ts`
4. **Actualizar**: `.env` con configuración ganadora
5. **Probar**: `npx prisma migrate status` y `npm run db:seed`
6. **Documentar**: En sesión de Claude qué configuración funcionó

Si después de esto **NADA funciona**, compartir output de `diagnostico.log` para analizar juntos y evaluar migración a otra plataforma.
