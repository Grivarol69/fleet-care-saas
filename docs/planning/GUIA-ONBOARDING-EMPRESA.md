# Guia de Onboarding - Alta de Nueva Empresa

**Fecha:** 2026-01-29
**Estado:** Listo para ejecutar
**Prerequisito:** Corregir los bugs criticos antes de ejecutar (ver seccion 0)

---

## SECCION 0: BUGS CRITICOS A CORREGIR ANTES DEL ONBOARDING

Antes de dar de alta una nueva empresa, es **obligatorio** corregir estos 3 problemas:

### Bug 1: PURCHASER no mapeado desde Clerk

**Archivo:** `src/lib/auth.ts` linea 14
**Problema:** La funcion `mapClerkRoleToPrisma()` no tiene case para `"purchaser"`. Si se crea un miembro con rol `org:purchaser` en Clerk, se mapeara a MANAGER por default.

**Fix requerido:**

```typescript
// Agregar despues de case 'driver':
case 'purchaser':
  return 'PURCHASER'
```

### Bug 2: PURCHASER no tiene items en la sidebar

**Archivo:** `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts`
**Problema:** El rol `PURCHASER` no esta incluido en ningun array de `roles[]` de la sidebar. Un PURCHASER veria la sidebar completamente vacia.

**Fix requerido:** Agregar `UserRole.PURCHASER` a los items relevantes:

- Mantenimiento > Facturas
- Mantenimiento > Ordenes de Trabajo (lectura)
- Inventario > Compras
- Inventario > Catalogo de Partes
- Personal > Proveedores

### Bug 3: PURCHASER no esta en permissions.ts

**Archivo:** `src/lib/permissions.ts`
**Problema:** No existe `isPurchaser()` ni esta incluido en permisos compuestos.

**Fix requerido:** Agregar `isPurchaser()` y actualizar permisos como `canApproveInvoices`, `canViewCosts`, etc.

---

## SECCION 1: DATOS DE LA EMPRESA DE PRUEBA

### Empresa: "Transportes del Caribe SAS"

| Campo         | Valor                         |
| ------------- | ----------------------------- |
| Nombre        | Transportes del Caribe SAS    |
| NIT           | 900.555.777-1                 |
| Pais          | Colombia (CO)                 |
| Ciudad        | Barranquilla                  |
| Email billing | admin@transportesdelcaribe.co |
| Telefono      | +57 315 555 7777              |

### Usuarios a crear (6 roles)

| #   | Nombre                 | Email                                  | Rol Clerk      | Rol Prisma    | Descripcion            |
| --- | ---------------------- | -------------------------------------- | -------------- | ------------- | ---------------------- |
| 1   | Carlos Mendoza         | carlos.mendoza@transportesdelcaribe.co | org:admin      | OWNER         | Dueno de la empresa    |
| 2   | Laura Gomez            | laura.gomez@transportesdelcaribe.co    | org:manager    | MANAGER       | Gerente de operaciones |
| 3   | Felipe Ruiz            | felipe.ruiz@transportesdelcaribe.co    | org:purchaser  | PURCHASER     | Encargado de compras   |
| 4   | Diego Herrera          | diego.herrera@transportesdelcaribe.co  | org:technician | TECHNICIAN    | Mecanico jefe          |
| 5   | Ana Torres             | ana.torres@transportesdelcaribe.co     | org:driver     | DRIVER        | Conductora             |
| 6   | Tu usuario SUPER_ADMIN | (tu email existente)                   | org:admin      | SUPER_ADMIN\* | Admin del SaaS         |

> \*SUPER_ADMIN se asigna manualmente en la BD despues de la creacion automatica.

---

## SECCION 2: PASO A PASO EN CLERK DASHBOARD

### Paso 2.1: Crear la organizacion en Clerk

1. Ir a [Clerk Dashboard](https://dashboard.clerk.com)
2. Seleccionar tu aplicacion Fleet Care
3. En la barra lateral: **Organizations**
4. Click en **+ Create Organization**
5. Completar:
   - Name: `Transportes del Caribe SAS`
   - Slug: `transportes-del-caribe` (se genera automatico)
6. Click **Create**
7. **IMPORTANTE:** Copiar el `Organization ID` (formato: `org_XXXXXXXXXXXXX`)
   - Este ID sera el `tenantId` en la base de datos

### Paso 2.2: Configurar roles custom en Clerk (si no existen)

Clerk por defecto solo tiene `org:admin` y `org:member`. Necesitas crear roles custom:

1. Ir a Clerk Dashboard > **Roles**
2. Verificar que existen estos roles (crear si faltan):

| Clerk Role Key   | Display Name | Permisos                                |
| ---------------- | ------------ | --------------------------------------- |
| `org:admin`      | Admin        | (ya existe por defecto)                 |
| `org:manager`    | Manager      | Lectura y escritura de datos del tenant |
| `org:purchaser`  | Purchaser    | Gestion de compras e inventario         |
| `org:technician` | Technician   | Ejecucion de ordenes de trabajo         |
| `org:driver`     | Driver       | Registro de odometro                    |

> Si Clerk no permite crear roles custom en tu plan, puedes usar `org:member` y luego ajustar manualmente el rol en la BD.

### Paso 2.3: Crear usuarios e invitar a la organizacion

Para CADA usuario de la tabla de la Seccion 1:

**Opcion A: Crear usuario + invitar (recomendado)**

1. En Clerk Dashboard > **Users** > **+ Create User**
2. Completar:
   - Email: (segun tabla)
   - First name: (segun tabla)
   - Last name: (segun tabla)
   - Password: `FleetCare2026!` (temporal, obligar cambio en primer login)
3. Click **Create**
4. Ir a **Organizations** > `Transportes del Caribe SAS` > **Members**
5. Click **+ Invite member**
6. Buscar el usuario por email
7. Seleccionar el **rol** correcto (segun tabla)
8. Click **Invite**

**Opcion B: Invitar por email (el usuario se registra solo)**

1. Ir a **Organizations** > `Transportes del Caribe SAS` > **Members**
2. Click **+ Invite member**
3. Escribir el email
4. Seleccionar el rol
5. Click **Send invitation**
6. El usuario recibira un email para registrarse

### Paso 2.4: Orden de creacion de usuarios

Seguir este orden para evitar problemas:

```
1. Carlos Mendoza  (OWNER)      ← Primer usuario, administra la org
2. Laura Gomez     (MANAGER)    ← Gerente, acceso amplio
3. Felipe Ruiz     (PURCHASER)  ← Compras (verificar que el bug este corregido!)
4. Diego Herrera   (TECHNICIAN) ← Mecanico
5. Ana Torres      (DRIVER)     ← Conductora
```

---

## SECCION 3: VERIFICACION EN LA APLICACION

### Paso 3.1: Login como OWNER (Carlos Mendoza)

1. Abrir la app: `http://localhost:3000/sign-in`
2. Login con: `carlos.mendoza@transportesdelcaribe.co`
3. **Verificar:**
   - [ ] Redirige a `/dashboard`
   - [ ] La sidebar muestra el rol `(OWNER)` junto a "MENU"
   - [ ] Ve: Dashboard, Empresa, Vehiculos, Mantenimiento, Inventario, Checklist, Personal, Reportes, Configuracion
   - [ ] NO ve: Marcas, Lineas, Tipos (maestras globales, solo SUPER_ADMIN)
   - [ ] En Configuracion ve: Users, Tipos de Documento
   - [ ] NO ve: Tenant, Roles, Permisos (solo SUPER_ADMIN)

### Paso 3.2: Login como MANAGER (Laura Gomez)

1. Cerrar sesion (click en avatar > Sign out)
2. Login con: `laura.gomez@transportesdelcaribe.co`
3. **Verificar:**
   - [ ] La sidebar muestra `(MANAGER)`
   - [ ] Ve: Dashboard, Empresa, Vehiculos, Mantenimiento, Inventario, Checklist, Personal, Reportes
   - [ ] NO ve: Configuracion (ni Tenant, ni Users, ni Roles)
   - [ ] NO ve: Marcas, Lineas, Tipos (maestras globales)
   - [ ] SI ve: Plantillas, Paquetes, Programas, OT, Facturas, Alertas

### Paso 3.3: Login como PURCHASER (Felipe Ruiz)

> **IMPORTANTE:** Este paso solo funciona si se corrigieron los bugs de la Seccion 0.

1. Cerrar sesion
2. Login con: `felipe.ruiz@transportesdelcaribe.co`
3. **Verificar:**
   - [ ] La sidebar muestra `(PURCHASER)`
   - [ ] Ve: Facturas, Inventario > Compras, Personal > Proveedores
   - [ ] NO ve: Dashboard general, Empresa, Mantenimiento maestras
   - [ ] NO ve: Configuracion

### Paso 3.4: Login como TECHNICIAN (Diego Herrera)

1. Cerrar sesion
2. Login con: `diego.herrera@transportesdelcaribe.co`
3. **Verificar:**
   - [ ] La sidebar muestra `(TECHNICIAN)`
   - [ ] Ve: Vehiculos (Listado + Odometro), Mantenimiento (OT + Alertas), Inventario, Checklist
   - [ ] NO ve: Dashboard, Empresa, Personal, Reportes, Configuracion
   - [ ] NO ve: Facturas, Plantillas, Paquetes, Programas
   - [ ] En Checklist: ve Inspeccionar e Historial, NO ve Crear

### Paso 3.5: Login como DRIVER (Ana Torres)

1. Cerrar sesion
2. Login con: `ana.torres@transportesdelcaribe.co`
3. **Verificar:**
   - [ ] La sidebar muestra `(DRIVER)`
   - [ ] Ve: Vehiculos > Odometro (y NADA mas)
   - [ ] NO ve: Dashboard, Empresa, Mantenimiento, Inventario, Checklist, Personal, Reportes, Configuracion
   - [ ] La sidebar tiene una unica seccion "Vehiculos" con un unico sub-item "Odometro"

### Paso 3.6: Verificar aislamiento multi-tenant

1. Login como Carlos Mendoza (OWNER de Transportes del Caribe)
2. Ir a Vehiculos > Listado
3. **Verificar:**
   - [ ] La lista esta vacia (es un tenant nuevo)
   - [ ] NO aparecen vehiculos de otros tenants (ej: TransLogistica)
4. Crear un vehiculo de prueba:
   - Placa: `QWE-001`
   - Marca: Chevrolet (global)
   - Linea: Spark (global)
   - Tipo: Sedan (global)
   - Ano: 2024
   - Color: Blanco
5. **Verificar:**
   - [ ] El vehiculo aparece en el listado
   - [ ] Si se cambia a otro tenant, este vehiculo NO aparece

---

## SECCION 4: ASIGNAR SUPER_ADMIN (Manual en BD)

El rol SUPER_ADMIN no se puede asignar desde Clerk. Se hace directo en la base de datos.

### Paso 4.1: Identificar el usuario en la BD

Despues de que tu usuario admin haga login al menos una vez (para que se auto-cree en Prisma):

```sql
-- Buscar tu usuario por email
SELECT id, email, role, "tenantId"
FROM "User"
WHERE email = 'TU_EMAIL_AQUI';
```

### Paso 4.2: Actualizar a SUPER_ADMIN

```sql
-- Cambiar rol a SUPER_ADMIN
UPDATE "User"
SET role = 'SUPER_ADMIN'
WHERE email = 'TU_EMAIL_AQUI'
  AND "tenantId" = 'ORG_ID_DEL_TENANT';
```

### Paso 4.3: Verificar acceso

1. Cerrar sesion y volver a entrar
2. **Verificar:**
   - [ ] La sidebar muestra `(SUPER_ADMIN)`
   - [ ] Ve TODAS las secciones (8 secciones top-level)
   - [ ] Ve maestras globales: Marcas, Lineas, Tipos, Master Items, Categorias
   - [ ] Ve Configuracion completa: Tenant, Users, Roles, Permisos, Tipos de Documento

---

## SECCION 5: DATOS INICIALES DE LA EMPRESA

Despues de verificar que todos los roles funcionan, el OWNER o MANAGER debe cargar datos basicos:

### Paso 5.1: Vehiculos (como OWNER o MANAGER)

Crear al menos 3 vehiculos:

| Placa   | Marca     | Linea  | Tipo          | Ano  | Color  | Km    |
| ------- | --------- | ------ | ------------- | ---- | ------ | ----- |
| QWE-001 | Chevrolet | Spark  | Sedan         | 2024 | Blanco | 15000 |
| QWE-002 | Toyota    | Hilux  | Camioneta 4x4 | 2023 | Negro  | 45000 |
| QWE-003 | Ford      | Ranger | Camioneta 4x4 | 2022 | Gris   | 78000 |

### Paso 5.2: Personal

**Conductores** (Dashboard > Personal > Conductores):
| Nombre | Licencia | Telefono |
|--------|----------|----------|
| Ana Torres | COL-123456 | 315-555-0001 |
| Roberto Silva | COL-789012 | 315-555-0002 |

**Tecnicos** (Dashboard > Personal > Tecnicos):
| Nombre | Especialidad | Tipo |
|--------|-------------|------|
| Diego Herrera | GENERAL | INTERNAL |
| Mario Lopez | MOTOR | CONTRACTOR |

**Proveedores** (Dashboard > Personal > Proveedores):
| Nombre | Especialidad | Telefono |
|--------|-------------|----------|
| AutoPartes del Norte | REPUESTOS | 315-555-0010 |
| Lubricantes Express | LUBRICANTES | 315-555-0020 |
| Frenos y Suspension SAS | FRENOS | 315-555-0030 |

### Paso 5.3: Asignar programa de mantenimiento

1. Como OWNER/MANAGER, ir a Mantenimiento > Programas Vehiculos
2. Seleccionar vehiculo QWE-001
3. Asignar template de mantenimiento (usar un template global existente)
4. **Verificar:**
   - [ ] Se crea VehicleMantProgram
   - [ ] Se crean VehicleProgramPackage por cada paquete
   - [ ] Se crean VehicleProgramItem por cada item

### Paso 5.4: Registrar odometro (como DRIVER)

1. Login como Ana Torres (DRIVER)
2. Ir a Vehiculos > Odometro
3. Registrar lectura: Vehiculo QWE-001, km = 15500
4. **Verificar:**
   - [ ] La lectura se registra correctamente
   - [ ] Se dispara MaintenanceAlertService.checkAndGenerateAlerts()

---

## SECCION 6: CHECKLIST FINAL DE VERIFICACION

### Roles y Sidebar

- [ ] OWNER ve 8 secciones (todo excepto maestras globales)
- [ ] MANAGER ve 7 secciones (sin Configuracion)
- [ ] PURCHASER ve secciones de compras/facturas (post-fix)
- [ ] TECHNICIAN ve 3-4 secciones (operativas)
- [ ] DRIVER ve solo Odometro
- [ ] SUPER_ADMIN ve absolutamente todo

### Multi-tenancy

- [ ] Datos del nuevo tenant son independientes
- [ ] No se ven datos de otros tenants
- [ ] Las marcas/lineas/tipos globales SI son visibles

### Auth Flow

- [ ] Login funciona para todos los usuarios
- [ ] Redirect a /onboarding si no tiene organizacion
- [ ] Redirect a /dashboard despues del login exitoso
- [ ] Auto-creacion de Tenant en Prisma funciona
- [ ] Auto-creacion de User en Prisma funciona
- [ ] El rol mapeado desde Clerk es correcto

### API

- [ ] `/api/auth/me` retorna role y tenantId correctos
- [ ] Las APIs filtran por tenantId
- [ ] Las APIs verifican permisos por rol

---

## SECCION 7: ROLLBACK (si algo sale mal)

### Eliminar el tenant de prueba

Si necesitas empezar de 0, ejecutar en orden:

```sql
-- 1. Eliminar datos dependientes (orden FK)
DELETE FROM "MaintenanceAlert" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "VehicleProgramItem" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "VehicleProgramPackage" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "VehicleMantProgram" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "InvoiceItem" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "tenantId" = 'ORG_ID');
DELETE FROM "Invoice" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "WorkOrderItem" WHERE "workOrderId" IN (SELECT id FROM "WorkOrder" WHERE "tenantId" = 'ORG_ID');
DELETE FROM "WorkOrderExpense" WHERE "workOrderId" IN (SELECT id FROM "WorkOrder" WHERE "tenantId" = 'ORG_ID');
DELETE FROM "WorkOrder" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "Document" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "OdometerLog" WHERE "vehicleId" IN (SELECT id FROM "Vehicle" WHERE "tenantId" = 'ORG_ID');
DELETE FROM "VehicleDriver" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "Vehicle" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "Driver" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "Technician" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "Provider" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "User" WHERE "tenantId" = 'ORG_ID';
DELETE FROM "DocumentTypeConfig" WHERE "tenantId" = 'ORG_ID';

-- 2. Eliminar el tenant
DELETE FROM "Tenant" WHERE id = 'ORG_ID';
```

> Reemplazar `ORG_ID` con el ID real de la organizacion de Clerk.

### Eliminar la organizacion en Clerk

1. Clerk Dashboard > Organizations > Transportes del Caribe SAS
2. Settings > Delete Organization
3. Confirmar eliminacion

---

## Notas Importantes

1. **Siempre corregir los bugs de la Seccion 0 antes de probar con PURCHASER**
2. **El primer usuario que haga login auto-crea el Tenant y su User en Prisma**
3. **SUPER_ADMIN nunca se auto-asigna - siempre es manual en BD**
4. **Los datos globales (marcas, lineas, tipos, items) son compartidos entre todos los tenants**
5. **Al cambiar de usuario, la sidebar se actualiza automaticamente via `/api/auth/me`**
6. **Si un usuario no ve nada en la sidebar, verificar: (a) que tiene organizacion activa en Clerk, (b) que su rol esta mapeado, (c) que el rol tiene items en la sidebar**
