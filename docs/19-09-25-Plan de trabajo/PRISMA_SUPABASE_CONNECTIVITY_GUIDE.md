
# Guía Definitiva de Conectividad entre Prisma y Supabase

Este documento resume los problemas de conectividad encontrados y las soluciones aplicadas durante la sesión de depuración del 2025-09-18. El objetivo es evitar futuros errores y estandarizar el manejo de la base de datos en el proyecto.

---

## El Problema Central: No todas las conexiones son iguales

Supabase provee dos URLs de conexión a la base de datos, y cada una tiene un propósito específico:

1.  **`DATABASE_URL` (Conexión Agrupada / Pooled):**
    *   Usa el puerto `6543` y el parámetro `pgbouncer=true`.
    *   **Propósito:** Está optimizada para un alto número de conexiones cortas y simultáneas, típico de una aplicación web o serverless.
    *   **Cuándo usarla:** **Siempre** para la aplicación Next.js (`next dev`, `next start`).

2.  **`DIRECT_URL` (Conexión Directa):**
    *   Usa el puerto `5432`.
    *   **Propósito:** Provee una conexión directa y sin intermediarios a la base de datos.
    *   **Cuándo usarla:** **Siempre** para tareas administrativas que modifican el schema o cargan datos masivamente.
        *   Comandos de la CLI de Prisma (`prisma migrate`, `prisma db push`, `prisma db seed`).
        *   Scripts personalizados que interactúan con la base de datos (`tsx scripts/mi-script.ts`).

El no respetar esta separación fue la causa raíz de todos los problemas de conexión.

---

## Diagnóstico y Soluciones Aplicadas

### 1. Error en `prisma migrate` y `db push` (Error `P1001`)

*   **Síntoma:** Los comandos de la CLI de Prisma fallaban con el error `P1001: Can't reach database server` o `FATAL: Address not in tenant allow_list`.
*   **Causa:** Aunque `schema.prisma` estaba correctamente configurado con `directUrl = env("DIRECT_URL")`, el entorno del terminal no lograba conectarse.
*   **Solución:**
    1.  **Firewall de Supabase:** El acceso directo (puerto `5432`) está restringido por una lista de IPs. Se tuvo que añadir la IP pública del desarrollador a la "allowlist" de la red en la configuración de la base de datos del proyecto en `supabase.com`.
    2.  **Diagnóstico:** El error `FATAL: Address not in tenant allow_list: {IP}` nos indicó la dirección IP exacta que debía ser añadida.

### 2. Error en Scripts Personalizados (`tsx ...`)

*   **Síntoma:** Scripts como `create-test-tenants.ts` fallaban de forma intermitente con el error `Can't reach database server`, incluso cuando `prisma migrate` ya funcionaba.
*   **Causa:** Los procesos de Node.js ejecutados con `tsx` no siempre cargan las variables de los archivos `.env` de forma automática o predecible. Esto causaba que `process.env.DIRECT_URL` fuera `undefined` dentro del script, y Prisma intentaba conectarse sin una URL válida.
*   **Solución Definitiva:**
    1.  **Modificar el Script:** Se cambió la inicialización de Prisma para que usara explícitamente la `DIRECT_URL`:
        ```typescript
        const prisma = new PrismaClient({
          datasources: {
            db: {
              url: process.env.DIRECT_URL,
            },
          },
        });
        ```
    2.  **Instalar `dotenv`:** Se añadió el paquete `dotenv` al proyecto (`pnpm install -D dotenv`).
    3.  **Ejecutar el Script de Forma Robusta:** Se adoptó un nuevo patrón para ejecutar los scripts, usando `dotenv` para precargar las variables de entorno. Esto asegura que `process.env` esté poblado correctamente antes de que cualquier código se ejecute.
        ```bash
        npx tsx -r dotenv/config scripts/create-test-tenants.ts
        ```

---

## Resumen de Buenas Prácticas

1.  **App Next.js:** No necesita cambios. Usa la `DATABASE_URL` (pooled) por defecto a través de `src/lib/prisma.ts`.
2.  **Migraciones:** Siempre se ejecutan con `npx prisma migrate ...`. Funcionarán correctamente siempre que la IP del desarrollador esté en la "allowlist" de Supabase.
3.  **Scripts de Datos (`seed`, etc.):**
    *   Siempre deben inicializar Prisma Client apuntando explícitamente a `process.env.DIRECT_URL`.
    *   Siempre deben ejecutarse usando el patrón `npx tsx -r dotenv/config <ruta_del_script>`. Se pueden crear atajos para esto en los `scripts` de `package.json`.

Siguiendo estas reglas, la conectividad con la base de datos será estable y predecible en todos los entornos.
