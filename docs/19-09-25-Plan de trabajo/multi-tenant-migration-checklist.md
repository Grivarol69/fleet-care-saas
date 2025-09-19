# 🚀 Multi-Tenant Migration Checklist - EXACTO

## ✅ CONFIGURACIÓN QUE FUNCIONA EN `feature/multi-tenant`

### 1. **MIDDLEWARE CRÍTICO** (`src/middleware.ts`)
```typescript
// ⚠️ CRÍTICO: Debe usar NextResponse.rewrite(url) NO NextResponse.next()
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    console.log('🚀 MIDDLEWARE EJECUTÁNDOSE:', request.nextUrl.pathname, 'HOST:', request.headers.get('host'))
    
    const url = request.nextUrl.clone()
    const hostname = request.headers.get('host') || ''
    const subdomain = getSubdomain(hostname)
    
    if (subdomain && subdomain !== 'www') {
        url.searchParams.set('tenant', subdomain)
        
        if (url.pathname === '/') {
            url.pathname = '/tenant'
        } else if (!url.pathname.startsWith('/tenant') && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/_next')) {
            url.pathname = `/tenant${url.pathname}`
        }
    }

    // 🔥 LÍNEA CRÍTICA: NextResponse.rewrite(url)
    let supabaseResponse = NextResponse.rewrite(url)
    
    // ... resto de configuración supabase
    
    return supabaseResponse
}
```

### 2. **API ENDPOINT** (`src/app/api/tenants/slug/[slug]/route.ts`)
```typescript
// ⚠️ CRÍTICO: Next.js 15 requiere params como Promise
export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params; // ⚠️ AWAIT aquí es crítico
  
  const result = await tenantService.getTenantBySlug(slug);
  // ... resto del código
}
```

### 3. **PÁGINA TENANT SIMPLE** (`src/app/tenant/page.tsx`)
```typescript
// ⚠️ CRÍTICO: NO usar TenantContext, extraer tenant del hostname directamente
const getTenantSlug = (): string | null => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const parts = hostname.split('.')
      if (parts.length > 1 && parts[0] && parts[0] !== 'localhost' && parts[0] !== 'www') {
        return parts[0]
      }
    }
    return null
}

useEffect(() => {
    const fetchTenant = async () => {
      const tenantSlug = getTenantSlug() // ⚠️ SINCRÓNICO aquí
      // ... fetch del tenant
    }
    fetchTenant()
}, [])
```

### 4. **LAYOUT SIMPLIFICADO** (`src/app/tenant/layout.tsx`)
```typescript
// ⚠️ CRÍTICO: NO usar TenantProvider problemático
export default function TenantLayout({ children }: TenantLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
```

### 5. **ARCHIVOS QUE DEBEN EXISTIR:**
- ✅ `src/middleware.ts` (NO `middleware.ts` en root)
- ✅ `src/app/api/tenants/slug/[slug]/route.ts`
- ✅ `src/app/tenant/page.tsx`
- ✅ `src/app/tenant/layout.tsx`
- ✅ `src/lib/tenant.ts` (con getTenantBySlug)

### 6. **ARCHIVOS QUE NO DEBEN INTERFERIR:**
- ❌ `middleware.ts` en root (debe eliminarse)
- ❌ TenantContext con llamadas directas a DB
- ❌ NextResponse.next() en middleware

---

## 🎯 PROCESO DE MIGRACIÓN SEGURA

### FASE 1: PREPARACIÓN
1. **Backup completo** de `feature/multi-tenant`
2. **Verificar** que funciona con `palmar.localhost:3000`
3. **Documentar** estado actual de `develop`

### FASE 2: ANÁLISIS DE CONFLICTOS
1. Comparar `feature/multi-tenant` vs `develop`
2. Identificar archivos que pueden conflictuar
3. Preparar resolución manual de conflictos

### FASE 3: MIGRACIÓN CONTROLADA
1. Crear branch temporal `merge-multi-tenant`
2. Mergear archivo por archivo verificando
3. Probar funcionalidad en cada paso
4. Solo entonces mergear a `develop`

### FASE 4: VALIDACIÓN
1. Verificar `palmar.localhost:3000` funciona
2. Verificar otros tenants funcionan
3. Verificar API endpoints funcionan
4. Verificar middleware logs correctos

---

## 🚨 PUNTOS CRÍTICOS APRENDIDOS

1. **NextResponse.rewrite() vs NextResponse.next()**: Diferencia fundamental
2. **TenantContext problemático**: Llamadas directas a DB desde cliente
3. **Condiciones de carrera**: useEffect vs función sincrónica
4. **Next.js 15**: params debe ser await
5. **Ubicación middleware**: src/ vs root

---

## ✅ CHECKLIST FINAL ANTES DE MERGE

- [ ] Middleware usa NextResponse.rewrite()
- [ ] API tenants existe y funciona
- [ ] Página tenant NO usa TenantContext
- [ ] Layout tenant simplificado
- [ ] Middleware en src/ NO en root
- [ ] palmar.localhost:3000 funciona
- [ ] hfd.localhost:3000 funciona
- [ ] API /api/tenants/slug/palmar responde
- [ ] Console logs muestran datos correctos

---

**📝 NOTAS IMPORTANTES:**
- Esta configuración funcionó el 19/09/2025 a las 17:30
- Desarrollado durante sesión de depuración exhaustiva
- Comparación exitosa con feature/multi-tenant-clean
- Problema principal: middleware incorrecto vs correcto

---

## 🔄 ESTRATEGIAS DE MIGRACIÓN RECOMENDADAS

### OPCIÓN A: MERGE DIRECTO CONFIADO
```bash
git checkout develop
git merge feature/multi-tenant
# Resolver conflictos manualmente
git push origin develop
```

### OPCIÓN B: CHERRY-PICK SELECTIVO (RECOMENDADO)
```bash
git checkout develop
git checkout -b temp-multi-tenant-migration

# Copiar archivos específicos uno por uno
git checkout feature/multi-tenant -- src/middleware.ts
git checkout feature/multi-tenant -- src/app/api/tenants/
git checkout feature/multi-tenant -- src/app/tenant/
git checkout feature/multi-tenant -- src/lib/tenant.ts

# Probar funcionalidad después de cada archivo
# Solo mergear si todo funciona
```

### OPCIÓN C: RECREAR DESDE CERO (MÁS SEGURO)
```bash
git checkout develop
# Recrear cada archivo manualmente siguiendo este checklist
# Probar paso a paso
```

---

## 🎯 RECOMENDACIÓN FINAL

**Usar OPCIÓN B (Cherry-pick selectivo)** porque:
1. Control total sobre qué se migra
2. Posibilidad de probar cada paso
3. Fácil rollback si algo falla
4. Preserva historial de git limpio