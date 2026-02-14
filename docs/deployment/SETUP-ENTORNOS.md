# 🚀 CONFIGURACIÓN DE ENTORNOS - FLEET CARE

## ✅ Configuración Completada Automáticamente

1. **✅ Git Branches:**
   - `main` → Production
   - `develop` → Staging

2. **✅ Variables de Entorno:**
   - `.env.local` → Development
   - `.env.staging` → Staging (template)
   - `.env.production` → Production (template)

3. **✅ Vercel Configuration:**
   - `vercel.json` actualizado con headers de seguridad

## 🔧 Configuración Manual Requerida

### 1. Dominios Locales (REQUERIDO)

Para probar subdomains en localhost, ejecuta:

```bash
sudo bash scripts/setup-local-domains.sh
```

Esto agregará a `/etc/hosts`:

- `admin.localhost` → Super Admin Panel
- `tenant1.localhost` → Tenant de prueba 1
- `tenant2.localhost` → Tenant de prueba 2

### 2. Configurar Vercel (Después del desarrollo)

1. **Conectar branches en Vercel:**
   - `main` branch → Production deployment
   - `develop` branch → Preview deployment

2. **Configurar variables de entorno en Vercel:**

   **Para Production:**

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-prod.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key-produccion
   NEXT_PUBLIC_APP_URL=https://fleetcare.com
   NEXT_PUBLIC_ENVIRONMENT=production
   NEXT_PUBLIC_DOMAIN=fleetcare.com
   ```

   **Para Preview (develop branch):**

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-staging.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key-staging
   NEXT_PUBLIC_APP_URL=https://staging-fleetcare.vercel.app
   NEXT_PUBLIC_ENVIRONMENT=staging
   NEXT_PUBLIC_DOMAIN=staging-fleetcare.vercel.app
   ```

### 3. Crear Proyectos de Supabase

1. **Proyecto Staging:** Para rama `develop`
2. **Proyecto Production:** Para rama `main`
3. **Mantener actual:** Para desarrollo local

## 🧪 Testing de la Configuración

### Paso 1: Configurar dominios locales

```bash
sudo bash scripts/setup-local-domains.sh
```

### Paso 2: Iniciar servidor de desarrollo

```bash
pnpm dev
```

### Paso 3: Verificar acceso

- ✅ http://localhost:3000 (app principal)
- ✅ http://admin.localhost:3000 (super admin)
- ✅ http://tenant1.localhost:3000 (tenant 1)

## 📝 Notas Importantes

- Los archivos `.env.staging` y `.env.production` son templates
- Actualiza las URLs de Supabase cuando crees los proyectos
- Los scripts están en la carpeta `scripts/`
- Para remover dominios locales: `sudo bash scripts/remove-local-domains.sh`

## 🎯 Próximos Pasos

1. Ejecutar setup de dominios locales
2. Implementar middleware de subdomains
3. Crear sistema de tenants
4. Configurar deployments automáticos
