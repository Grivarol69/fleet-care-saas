# CHECKLIST DIA DE LANZAMIENTO - Fleet Care SaaS

Fecha: **_/_**/**\_\_**
Cliente: ****************\_****************
Responsable: **************\_**************

---

## 1. DATOS A SOLICITAR AL CLIENTE

Enviar este formulario al cliente ANTES del dia de lanzamiento:

### Datos de la empresa

| Campo                | Valor |
| -------------------- | ----- |
| Razon social         |       |
| NIT / RUT            |       |
| Pais                 |       |
| Ciudad               |       |
| Email de facturacion |       |
| Telefono contacto    |       |

### Listado de usuarios

Completar una fila por cada persona que usara el sistema:

| #   | Nombre completo | Email | Funcion / Cargo | Rol asignado |
| --- | --------------- | ----- | --------------- | ------------ |
| 1   |                 |       |                 | OWNER        |
| 2   |                 |       |                 |              |
| 3   |                 |       |                 |              |
| 4   |                 |       |                 |              |
| 5   |                 |       |                 |              |
| 6   |                 |       |                 |              |
| 7   |                 |       |                 |              |
| 8   |                 |       |                 |              |

### Guia de roles (compartir con el cliente para que elija)

| Rol        | Descripcion sencilla                                                 | Ejemplo de cargo                   |
| ---------- | -------------------------------------------------------------------- | ---------------------------------- |
| OWNER      | Dueno o representante legal. Ve todo, configura la empresa           | Gerente General, Socio             |
| MANAGER    | Supervisor de operaciones. Ve todo excepto configuracion de usuarios | Jefe de Operaciones, Coordinador   |
| PURCHASER  | Encargado de compras. Ve facturas, proveedores, inventario           | Jefe de Compras, Auxiliar Contable |
| TECHNICIAN | Mecanico o tecnico. Ve ordenes de trabajo, alertas, checklist        | Mecanico, Tecnico Automotriz       |
| DRIVER     | Conductor. Solo registra kilometraje                                 | Conductor, Operador                |

---

## 2. PREREQUISITOS (verificar antes de empezar)

- [ ] Servidor de produccion/staging funcionando
- [ ] Base de datos accesible
- [ ] Variables de entorno configuradas (Clerk, DB, UploadThing)
- [ ] Verificar que los 3 fixes de PURCHASER estan deployados:
  - [ ] auth.ts tiene case 'purchaser'
  - [ ] SidebarRoutes.data.ts tiene PURCHASER en items
  - [ ] permissions.ts tiene isPurchaser()
- [ ] Acceso al Clerk Dashboard: https://dashboard.clerk.com

---

## 3. CREAR ROLES CUSTOM EN CLERK (solo la primera vez)

Solo necesitas hacer esto UNA VEZ. Si ya existen, saltar al paso 4.

1. Ir a Clerk Dashboard > Configurar > Roles
2. Crear estos roles si no existen:

| Clerk Key      | Display Name  | Creado?                     |
| -------------- | ------------- | --------------------------- |
| org:admin      | Admin (OWNER) | [ ] (ya existe por defecto) |
| org:manager    | Manager       | [ ]                         |
| org:purchaser  | Purchaser     | [ ]                         |
| org:technician | Technician    | [ ]                         |
| org:driver     | Driver        | [ ]                         |

---

## 4. CREAR LA ORGANIZACION

1. Clerk Dashboard > Organizations > + Create Organization
2. Name: **************\_\_\_************** (razon social del cliente)
3. Click Create
4. Copiar Organization ID: org************\_************

   IMPORTANTE: Anotar este ID, es el tenantId en la base de datos.

- [ ] Organizacion creada
- [ ] ID copiado

---

## 5. INVITAR USUARIOS

Para CADA persona del listado:

1. Clerk Dashboard > Organizations > (nombre empresa) > Members
2. Click + Invite member
3. Email: (del listado)
4. Role: (segun listado)
5. Click Send invitation

### Registro de invitaciones

| #   | Nombre | Email | Rol               | Invitado? |
| --- | ------ | ----- | ----------------- | --------- |
| 1   |        |       | OWNER (org:admin) | [ ]       |
| 2   |        |       |                   | [ ]       |
| 3   |        |       |                   | [ ]       |
| 4   |        |       |                   | [ ]       |
| 5   |        |       |                   | [ ]       |
| 6   |        |       |                   | [ ]       |
| 7   |        |       |                   | [ ]       |
| 8   |        |       |                   | [ ]       |

---

## 6. ASIGNAR SUPER_ADMIN (tu usuario)

Despues de hacer login al menos una vez con tu usuario:

```sql
UPDATE "User"
SET role = 'SUPER_ADMIN'
WHERE email = '___________________________'
  AND "tenantId" = 'org_________________________';
```

- [ ] SQL ejecutado
- [ ] Verificado: sidebar muestra (SUPER_ADMIN) con acceso completo

---

## 7. VERIFICACION RAPIDA

Login con tu usuario SUPER_ADMIN y verificar:

- [ ] Dashboard carga correctamente
- [ ] Sidebar muestra todas las secciones (8)
- [ ] Marcas, Lineas, Tipos globales estan visibles
- [ ] Se puede crear un vehiculo de prueba
- [ ] Se puede eliminar el vehiculo de prueba

---

## 8. COMUNICAR AL CLIENTE

Enviar este mensaje al OWNER de la empresa:

---

Asunto: Tu cuenta de Fleet Care esta lista

Hola [NOMBRE],

Tu cuenta de Fleet Care ya esta configurada. Estos son los pasos para entrar:

1. Revisa tu email, recibiste una invitacion de Fleet Care
2. Hace click en "Aceptar invitacion"
3. Crea tu contrasena
4. Vas a entrar directamente al dashboard de tu empresa

URL de acceso: [URL DE LA APP]

Tu equipo tambien recibio invitaciones por email.
Cada persona debe seguir los mismos pasos.

Si alguien no recibio el email, que revise la carpeta de spam
o contactanos a [TU EMAIL DE SOPORTE].

Saludos,
Equipo Fleet Care

---

- [ ] Email enviado al OWNER
- [ ] OWNER confirmo que pudo entrar

---

## 9. PRIMER LOGIN DEL CLIENTE (acompanar)

Cuando el OWNER haga su primer login:

- [ ] Acepto invitacion por email
- [ ] Creo su contrasena
- [ ] Entro al dashboard
- [ ] Sidebar muestra (OWNER) con secciones correctas
- [ ] No ve maestras globales (Marcas, Lineas, Tipos) - correcto
- [ ] Si ve: Dashboard, Empresa, Vehiculos, Mantenimiento, Inventario, Personal, Reportes, Configuracion

---

## 10. POST-LANZAMIENTO

Despues de que el cliente este operando:

- [ ] Todos los usuarios invitados aceptaron y pudieron entrar
- [ ] Cada rol ve la sidebar correcta
- [ ] El cliente pudo cargar su primer vehiculo
- [ ] El cliente pudo registrar un odometro
- [ ] Sin errores reportados en las primeras 24hs

---

## TROUBLESHOOTING RAPIDO

### "No me llego el email de invitacion"

→ Verificar carpeta spam
→ Re-enviar desde Clerk Dashboard > Organizations > Members

### "Entro pero no veo nada en la sidebar"

→ El usuario no tiene organizacion activa en Clerk
→ Verificar en Clerk Dashboard que el usuario sea miembro de la org

### "Entro pero el rol no es el correcto"

→ Verificar el rol en Clerk Dashboard > Organizations > Members
→ Si el user ya existe en Prisma con rol viejo, actualizar en BD:

```sql
UPDATE "User"
SET role = 'ROL_CORRECTO'
WHERE email = 'email@ejemplo.com'
  AND "tenantId" = 'org_XXX';
```

### "Error al cargar el dashboard"

→ Verificar que el servidor esta corriendo
→ Verificar logs del servidor
→ Verificar que DATABASE_URL es correcta

---

Notas adicionales:

---

---

---

---
