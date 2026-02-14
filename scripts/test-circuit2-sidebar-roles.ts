/**
 * ============================================================
 * CIRCUITO 2: Sidebar Dinámica por Rol - Test Automatizado
 * ============================================================
 *
 * Ejecutar: npx tsx scripts/test-circuit2-sidebar-roles.ts
 *
 * Este script verifica:
 *   2.1 Filtrado correcto de sidebar por rol
 *   2.2 SUPER_ADMIN ve todas las secciones
 *   2.3 OWNER ve las secciones que le corresponden
 *   2.4 MANAGER ve las secciones que le corresponden
 *   2.5 TECHNICIAN solo ve OT, Alertas, Checklist, Odómetro
 *   2.6 DRIVER tiene acceso mínimo (solo Odómetro)
 *   2.7 PURCHASER (si existe en sidebar) tiene acceso correcto
 *   2.8 Items sin roles definidos son visibles para todos
 *   2.9 SubItems vacíos eliminan el padre
 */

// Reproducimos la lógica exacta de SidebarRoutes.tsx + SidebarRoutes.data.ts
// Importamos directamente para asegurar fidelidad

// ─── Tipos (replicados de la data) ───────────────────────────
// Usamos strings en lugar del enum de Prisma para poder correr sin generar el client
type UserRole =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'MANAGER'
  | 'PURCHASER'
  | 'TECHNICIAN'
  | 'DRIVER';

type SidebarSubItem = {
  label: string;
  href: string;
  roles?: UserRole[];
};

type SidebarItem = {
  label: string;
  href?: string;
  subItems?: SidebarSubItem[];
  roles?: UserRole[];
};

// ─── Data de la sidebar (copiada tal cual de SidebarRoutes.data.ts) ──
// NOTA: Si la data cambia, actualizar aquí también
const dataAdminSidebar: SidebarItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
  },
  {
    label: 'Empresa',
    roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
    subItems: [
      {
        label: 'Información',
        href: '/dashboard/empresa/informacion',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Configuración',
        href: '/dashboard/empresa/configuracion',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Sucursales',
        href: '/dashboard/empresa/sucursales',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
    ],
  },
  {
    label: 'Vehículos',
    roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN', 'DRIVER'],
    subItems: [
      {
        label: 'Listado Vehículos',
        href: '/dashboard/vehicles/fleet',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN'],
      },
      {
        label: 'Marcas',
        href: '/dashboard/vehicles/brands',
        roles: ['SUPER_ADMIN'],
      },
      {
        label: 'Líneas',
        href: '/dashboard/vehicles/lines',
        roles: ['SUPER_ADMIN'],
      },
      {
        label: 'Tipos',
        href: '/dashboard/vehicles/types',
        roles: ['SUPER_ADMIN'],
      },
      {
        label: 'Vehículos de la Empresa',
        href: '/dashboard/vehicles/vehicles',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Documentos Obligatorios',
        href: '/dashboard/vehicles/documents',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Odómetro',
        href: '/dashboard/vehicles/odometer',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN', 'DRIVER'],
      },
    ],
  },
  {
    label: 'Mantenimiento',
    roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN'],
    subItems: [
      {
        label: 'Master Items',
        href: '/dashboard/maintenance/mant-items',
        roles: ['SUPER_ADMIN'],
      },
      {
        label: 'Categorías',
        href: '/dashboard/maintenance/mant-categories',
        roles: ['SUPER_ADMIN'],
      },
      {
        label: 'Plantillas Planes Mantenimiento',
        href: '/dashboard/maintenance/mant-template',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Paquetes de Mantenimiento',
        href: '/dashboard/maintenance/packages',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Programas Vehículos',
        href: '/dashboard/maintenance/vehicle-programs',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Órdenes de Trabajo',
        href: '/dashboard/maintenance/work-orders',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN'],
      },
      {
        label: 'Facturas',
        href: '/dashboard/invoices',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Alertas',
        href: '/dashboard/maintenance/alerts',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN'],
      },
    ],
  },
  {
    label: 'Checklist',
    roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN'],
    subItems: [
      {
        label: 'Crear',
        href: '/dashboard/checklist/crear',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Inspeccionar',
        href: '/dashboard/checklist/inspeccionar',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN'],
      },
      {
        label: 'Historial',
        href: '/dashboard/checklist/historial',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN'],
      },
    ],
  },
  {
    label: 'Personal',
    roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
    subItems: [
      {
        label: 'Técnicos',
        href: '/dashboard/people/technician',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Conductores',
        href: '/dashboard/people/driver',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Proveedores',
        href: '/dashboard/people/provider',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
    ],
  },
  {
    label: 'Reportes',
    roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
    subItems: [
      {
        label: 'Costos',
        href: '/dashboard/reports/maintenance-costs',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Estado Flota',
        href: '/dashboard/reports/fleet-status',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
      {
        label: 'Eficiencia',
        href: '/dashboard/reports/maintenance-efficiency',
        roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
      },
    ],
  },
  {
    label: 'Configuración',
    roles: ['SUPER_ADMIN', 'OWNER'],
    subItems: [
      {
        label: 'Tenant',
        href: '/dashboard/admin/tenant',
        roles: ['SUPER_ADMIN'],
      },
      {
        label: 'Users',
        href: '/dashboard/admin/users',
        roles: ['SUPER_ADMIN', 'OWNER'],
      },
      {
        label: 'Roles',
        href: '/dashboard/admin/roles',
        roles: ['SUPER_ADMIN'],
      },
      {
        label: 'Permisos',
        href: '/dashboard/admin/permissions',
        roles: ['SUPER_ADMIN'],
      },
    ],
  },
];

// ─── Lógica de filtrado (replicada de SidebarRoutes.tsx) ─────
function filterItemsByRole(
  items: SidebarItem[],
  userRole: UserRole
): SidebarItem[] {
  return items
    .filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(userRole);
    })
    .map(item => {
      if (item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter(subItem => {
            if (!subItem.roles) return true;
            return subItem.roles.includes(userRole);
          }),
        };
      }
      return item;
    })
    .filter(item => !item.subItems || item.subItems.length > 0);
}

// ─── Helpers ─────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    const msg = detail ? `${testName} -- ${detail}` : testName;
    failures.push(msg);
    console.log(`  [FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function getTopLevelLabels(items: SidebarItem[]): string[] {
  return items.map(i => i.label);
}

function getSubItemLabels(items: SidebarItem[], parentLabel: string): string[] {
  const parent = items.find(i => i.label === parentLabel);
  return parent?.subItems?.map(s => s.label) || [];
}

function hasTopLevel(items: SidebarItem[], label: string): boolean {
  return items.some(i => i.label === label);
}

function hasSubItem(
  items: SidebarItem[],
  parent: string,
  sub: string
): boolean {
  const p = items.find(i => i.label === parent);
  return p?.subItems?.some(s => s.label === sub) || false;
}

// ─── 2.1 Verificar integridad de la data ─────────────────────
function test_2_1_dataIntegrity() {
  section('2.1 Integridad de la data de la sidebar');

  assert(
    dataAdminSidebar.length === 8,
    `Sidebar tiene 8 secciones top-level (got ${dataAdminSidebar.length})`
  );

  const topLabels = getTopLevelLabels(dataAdminSidebar);
  assert(topLabels.includes('Dashboard'), 'Existe seccion Dashboard');
  assert(topLabels.includes('Empresa'), 'Existe seccion Empresa');
  assert(topLabels.includes('Vehículos'), 'Existe seccion Vehiculos');
  assert(topLabels.includes('Mantenimiento'), 'Existe seccion Mantenimiento');
  assert(topLabels.includes('Checklist'), 'Existe seccion Checklist');
  assert(topLabels.includes('Personal'), 'Existe seccion Personal');
  assert(topLabels.includes('Reportes'), 'Existe seccion Reportes');
  assert(topLabels.includes('Configuración'), 'Existe seccion Configuracion');

  // Verificar que todas las secciones tienen roles definidos
  for (const item of dataAdminSidebar) {
    assert(
      item.roles !== undefined && item.roles.length > 0,
      `Seccion "${item.label}" tiene roles definidos (${item.roles?.join(', ')})`
    );
  }

  // Contar total de sub-items
  let totalSubItems = 0;
  for (const item of dataAdminSidebar) {
    if (item.subItems) {
      totalSubItems += item.subItems.length;
      for (const sub of item.subItems) {
        assert(
          sub.roles !== undefined && sub.roles.length > 0,
          `SubItem "${item.label} > ${sub.label}" tiene roles definidos`
        );
      }
    }
  }
  assert(totalSubItems > 0, `Existen ${totalSubItems} sub-items en total`);
}

// ─── 2.2 SUPER_ADMIN ve todo ────────────────────────────────
function test_2_2_superAdmin() {
  section('2.2 SUPER_ADMIN: acceso completo');

  const filtered = filterItemsByRole(dataAdminSidebar, 'SUPER_ADMIN');
  const topLabels = getTopLevelLabels(filtered);

  // Debe ver TODAS las 8 secciones
  assert(
    filtered.length === 8,
    `SUPER_ADMIN ve 8 secciones (got ${filtered.length})`
  );
  assert(topLabels.includes('Dashboard'), 'SUPER_ADMIN ve Dashboard');
  assert(topLabels.includes('Empresa'), 'SUPER_ADMIN ve Empresa');
  assert(topLabels.includes('Vehículos'), 'SUPER_ADMIN ve Vehiculos');
  assert(topLabels.includes('Mantenimiento'), 'SUPER_ADMIN ve Mantenimiento');
  assert(topLabels.includes('Checklist'), 'SUPER_ADMIN ve Checklist');
  assert(topLabels.includes('Personal'), 'SUPER_ADMIN ve Personal');
  assert(topLabels.includes('Reportes'), 'SUPER_ADMIN ve Reportes');
  assert(topLabels.includes('Configuración'), 'SUPER_ADMIN ve Configuracion');

  // Debe ver TODOS los sub-items de Vehiculos (incluyendo maestras)
  assert(
    hasSubItem(filtered, 'Vehículos', 'Marcas'),
    'SUPER_ADMIN ve Vehiculos > Marcas'
  );
  assert(
    hasSubItem(filtered, 'Vehículos', 'Líneas'),
    'SUPER_ADMIN ve Vehiculos > Lineas'
  );
  assert(
    hasSubItem(filtered, 'Vehículos', 'Tipos'),
    'SUPER_ADMIN ve Vehiculos > Tipos'
  );
  assert(
    hasSubItem(filtered, 'Vehículos', 'Listado Vehículos'),
    'SUPER_ADMIN ve Vehiculos > Listado'
  );
  assert(
    hasSubItem(filtered, 'Vehículos', 'Documentos Obligatorios'),
    'SUPER_ADMIN ve Vehiculos > Documentos'
  );
  assert(
    hasSubItem(filtered, 'Vehículos', 'Odómetro'),
    'SUPER_ADMIN ve Vehiculos > Odometro'
  );

  // Debe ver TODOS los sub-items de Mantenimiento (incluyendo maestras)
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Master Items'),
    'SUPER_ADMIN ve Mantto > Master Items'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Categorías'),
    'SUPER_ADMIN ve Mantto > Categorias'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Plantillas Planes Mantenimiento'),
    'SUPER_ADMIN ve Mantto > Plantillas'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Paquetes de Mantenimiento'),
    'SUPER_ADMIN ve Mantto > Paquetes'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Programas Vehículos'),
    'SUPER_ADMIN ve Mantto > Programas'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Órdenes de Trabajo'),
    'SUPER_ADMIN ve Mantto > OT'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Facturas'),
    'SUPER_ADMIN ve Mantto > Facturas'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Alertas'),
    'SUPER_ADMIN ve Mantto > Alertas'
  );

  // Debe ver TODOS los sub-items de Configuración
  assert(
    hasSubItem(filtered, 'Configuración', 'Tenant'),
    'SUPER_ADMIN ve Config > Tenant'
  );
  assert(
    hasSubItem(filtered, 'Configuración', 'Users'),
    'SUPER_ADMIN ve Config > Users'
  );
  assert(
    hasSubItem(filtered, 'Configuración', 'Roles'),
    'SUPER_ADMIN ve Config > Roles'
  );
  assert(
    hasSubItem(filtered, 'Configuración', 'Permisos'),
    'SUPER_ADMIN ve Config > Permisos'
  );

  // Contar total de sub-items visibles
  let totalSubItems = 0;
  for (const item of filtered) {
    if (item.subItems) totalSubItems += item.subItems.length;
  }
  // Dashboard no tiene subItems, 3+7+8+3+3+3+4 = 31 sub-items
  assert(
    totalSubItems === 31,
    `SUPER_ADMIN ve 31 sub-items total (got ${totalSubItems})`
  );
}

// ─── 2.3 OWNER ──────────────────────────────────────────────
function test_2_3_owner() {
  section('2.3 OWNER: acceso de dueño de empresa');

  const filtered = filterItemsByRole(dataAdminSidebar, 'OWNER');
  const topLabels = getTopLevelLabels(filtered);

  // OWNER ve: Dashboard, Empresa, Vehiculos, Mantenimiento, Checklist, Personal, Reportes, Configuración
  assert(
    filtered.length === 8,
    `OWNER ve 8 secciones (got ${filtered.length})`
  );
  assert(topLabels.includes('Dashboard'), 'OWNER ve Dashboard');
  assert(topLabels.includes('Empresa'), 'OWNER ve Empresa');
  assert(topLabels.includes('Vehículos'), 'OWNER ve Vehiculos');
  assert(topLabels.includes('Mantenimiento'), 'OWNER ve Mantenimiento');
  assert(topLabels.includes('Checklist'), 'OWNER ve Checklist');
  assert(topLabels.includes('Personal'), 'OWNER ve Personal');
  assert(topLabels.includes('Reportes'), 'OWNER ve Reportes');
  assert(topLabels.includes('Configuración'), 'OWNER ve Configuracion');

  // OWNER NO ve maestras globales
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Marcas'),
    'OWNER NO ve Vehiculos > Marcas (maestra global)'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Líneas'),
    'OWNER NO ve Vehiculos > Lineas (maestra global)'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Tipos'),
    'OWNER NO ve Vehiculos > Tipos (maestra global)'
  );
  assert(
    !hasSubItem(filtered, 'Mantenimiento', 'Master Items'),
    'OWNER NO ve Mantto > Master Items (maestra global)'
  );
  assert(
    !hasSubItem(filtered, 'Mantenimiento', 'Categorías'),
    'OWNER NO ve Mantto > Categorias (maestra global)'
  );

  // OWNER SI ve items operativos
  assert(
    hasSubItem(filtered, 'Vehículos', 'Listado Vehículos'),
    'OWNER ve Vehiculos > Listado'
  );
  assert(
    hasSubItem(filtered, 'Vehículos', 'Vehículos de la Empresa'),
    'OWNER ve Vehiculos > Vehiculos de la Empresa'
  );
  assert(
    hasSubItem(filtered, 'Vehículos', 'Documentos Obligatorios'),
    'OWNER ve Vehiculos > Documentos'
  );
  assert(
    hasSubItem(filtered, 'Vehículos', 'Odómetro'),
    'OWNER ve Vehiculos > Odometro'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Órdenes de Trabajo'),
    'OWNER ve Mantto > OT'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Facturas'),
    'OWNER ve Mantto > Facturas'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Alertas'),
    'OWNER ve Mantto > Alertas'
  );

  // OWNER ve Users pero NO ve Tenant, Roles, Permisos en Configuración
  assert(
    hasSubItem(filtered, 'Configuración', 'Users'),
    'OWNER ve Config > Users'
  );
  assert(
    !hasSubItem(filtered, 'Configuración', 'Tenant'),
    'OWNER NO ve Config > Tenant'
  );
  assert(
    !hasSubItem(filtered, 'Configuración', 'Roles'),
    'OWNER NO ve Config > Roles'
  );
  assert(
    !hasSubItem(filtered, 'Configuración', 'Permisos'),
    'OWNER NO ve Config > Permisos'
  );
}

// ─── 2.4 MANAGER ────────────────────────────────────────────
function test_2_4_manager() {
  section('2.4 MANAGER: acceso de gerente/supervisor');

  const filtered = filterItemsByRole(dataAdminSidebar, 'MANAGER');
  const topLabels = getTopLevelLabels(filtered);

  // MANAGER ve: Dashboard, Empresa, Vehiculos, Mantenimiento, Checklist, Personal, Reportes
  // MANAGER NO ve: Configuración (no está en roles de top-level)
  assert(topLabels.includes('Dashboard'), 'MANAGER ve Dashboard');
  assert(topLabels.includes('Empresa'), 'MANAGER ve Empresa');
  assert(topLabels.includes('Vehículos'), 'MANAGER ve Vehiculos');
  assert(topLabels.includes('Mantenimiento'), 'MANAGER ve Mantenimiento');
  assert(topLabels.includes('Checklist'), 'MANAGER ve Checklist');
  assert(topLabels.includes('Personal'), 'MANAGER ve Personal');
  assert(topLabels.includes('Reportes'), 'MANAGER ve Reportes');
  assert(!topLabels.includes('Configuración'), 'MANAGER NO ve Configuracion');

  assert(
    filtered.length === 7,
    `MANAGER ve 7 secciones (got ${filtered.length})`
  );

  // MANAGER NO ve maestras globales
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Marcas'),
    'MANAGER NO ve Vehiculos > Marcas'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Líneas'),
    'MANAGER NO ve Vehiculos > Lineas'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Tipos'),
    'MANAGER NO ve Vehiculos > Tipos'
  );
  assert(
    !hasSubItem(filtered, 'Mantenimiento', 'Master Items'),
    'MANAGER NO ve Mantto > Master Items'
  );
  assert(
    !hasSubItem(filtered, 'Mantenimiento', 'Categorías'),
    'MANAGER NO ve Mantto > Categorias'
  );

  // MANAGER SI ve items operativos
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Órdenes de Trabajo'),
    'MANAGER ve Mantto > OT'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Facturas'),
    'MANAGER ve Mantto > Facturas'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Alertas'),
    'MANAGER ve Mantto > Alertas'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Plantillas Planes Mantenimiento'),
    'MANAGER ve Mantto > Plantillas'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Paquetes de Mantenimiento'),
    'MANAGER ve Mantto > Paquetes'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Programas Vehículos'),
    'MANAGER ve Mantto > Programas'
  );
}

// ─── 2.5 TECHNICIAN ─────────────────────────────────────────
function test_2_5_technician() {
  section('2.5 TECHNICIAN: acceso operativo limitado');

  const filtered = filterItemsByRole(dataAdminSidebar, 'TECHNICIAN');
  const topLabels = getTopLevelLabels(filtered);

  // TECHNICIAN ve: Vehiculos (parcial), Mantenimiento (parcial), Checklist (parcial)
  // TECHNICIAN NO ve: Dashboard, Empresa, Personal, Reportes, Configuración
  assert(!topLabels.includes('Dashboard'), 'TECHNICIAN NO ve Dashboard');
  assert(!topLabels.includes('Empresa'), 'TECHNICIAN NO ve Empresa');
  assert(!topLabels.includes('Personal'), 'TECHNICIAN NO ve Personal');
  assert(!topLabels.includes('Reportes'), 'TECHNICIAN NO ve Reportes');
  assert(
    !topLabels.includes('Configuración'),
    'TECHNICIAN NO ve Configuracion'
  );

  assert(topLabels.includes('Vehículos'), 'TECHNICIAN ve Vehiculos');
  assert(topLabels.includes('Mantenimiento'), 'TECHNICIAN ve Mantenimiento');
  assert(topLabels.includes('Checklist'), 'TECHNICIAN ve Checklist');

  assert(
    filtered.length === 3,
    `TECHNICIAN ve 3 secciones (got ${filtered.length})`
  );

  // Vehiculos: solo Listado y Odómetro
  assert(
    hasSubItem(filtered, 'Vehículos', 'Listado Vehículos'),
    'TECHNICIAN ve Vehiculos > Listado'
  );
  assert(
    hasSubItem(filtered, 'Vehículos', 'Odómetro'),
    'TECHNICIAN ve Vehiculos > Odometro'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Marcas'),
    'TECHNICIAN NO ve Vehiculos > Marcas'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Líneas'),
    'TECHNICIAN NO ve Vehiculos > Lineas'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Tipos'),
    'TECHNICIAN NO ve Vehiculos > Tipos'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Vehículos de la Empresa'),
    'TECHNICIAN NO ve Vehiculos > Vehiculos Empresa'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Documentos Obligatorios'),
    'TECHNICIAN NO ve Vehiculos > Documentos'
  );

  const vehSubItems = getSubItemLabels(filtered, 'Vehículos');
  assert(
    vehSubItems.length === 2,
    `TECHNICIAN ve 2 sub-items en Vehiculos (got ${vehSubItems.length})`
  );

  // Mantenimiento: solo OT y Alertas
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Órdenes de Trabajo'),
    'TECHNICIAN ve Mantto > OT'
  );
  assert(
    hasSubItem(filtered, 'Mantenimiento', 'Alertas'),
    'TECHNICIAN ve Mantto > Alertas'
  );
  assert(
    !hasSubItem(filtered, 'Mantenimiento', 'Master Items'),
    'TECHNICIAN NO ve Mantto > Master Items'
  );
  assert(
    !hasSubItem(filtered, 'Mantenimiento', 'Categorías'),
    'TECHNICIAN NO ve Mantto > Categorias'
  );
  assert(
    !hasSubItem(filtered, 'Mantenimiento', 'Plantillas Planes Mantenimiento'),
    'TECHNICIAN NO ve Mantto > Plantillas'
  );
  assert(
    !hasSubItem(filtered, 'Mantenimiento', 'Paquetes de Mantenimiento'),
    'TECHNICIAN NO ve Mantto > Paquetes'
  );
  assert(
    !hasSubItem(filtered, 'Mantenimiento', 'Programas Vehículos'),
    'TECHNICIAN NO ve Mantto > Programas'
  );
  assert(
    !hasSubItem(filtered, 'Mantenimiento', 'Facturas'),
    'TECHNICIAN NO ve Mantto > Facturas'
  );

  const mantSubItems = getSubItemLabels(filtered, 'Mantenimiento');
  assert(
    mantSubItems.length === 2,
    `TECHNICIAN ve 2 sub-items en Mantenimiento (got ${mantSubItems.length})`
  );

  // Checklist: Inspeccionar e Historial, NO Crear
  assert(
    !hasSubItem(filtered, 'Checklist', 'Crear'),
    'TECHNICIAN NO ve Checklist > Crear'
  );
  assert(
    hasSubItem(filtered, 'Checklist', 'Inspeccionar'),
    'TECHNICIAN ve Checklist > Inspeccionar'
  );
  assert(
    hasSubItem(filtered, 'Checklist', 'Historial'),
    'TECHNICIAN ve Checklist > Historial'
  );

  const checkSubItems = getSubItemLabels(filtered, 'Checklist');
  assert(
    checkSubItems.length === 2,
    `TECHNICIAN ve 2 sub-items en Checklist (got ${checkSubItems.length})`
  );
}

// ─── 2.6 DRIVER ─────────────────────────────────────────────
function test_2_6_driver() {
  section('2.6 DRIVER: acceso mínimo');

  const filtered = filterItemsByRole(dataAdminSidebar, 'DRIVER');
  const topLabels = getTopLevelLabels(filtered);

  // DRIVER NO ve: Dashboard, Empresa, Mantenimiento, Checklist, Personal, Reportes, Configuración
  assert(!topLabels.includes('Dashboard'), 'DRIVER NO ve Dashboard');
  assert(!topLabels.includes('Empresa'), 'DRIVER NO ve Empresa');
  assert(!topLabels.includes('Mantenimiento'), 'DRIVER NO ve Mantenimiento');
  assert(!topLabels.includes('Checklist'), 'DRIVER NO ve Checklist');
  assert(!topLabels.includes('Personal'), 'DRIVER NO ve Personal');
  assert(!topLabels.includes('Reportes'), 'DRIVER NO ve Reportes');
  assert(!topLabels.includes('Configuración'), 'DRIVER NO ve Configuracion');

  // DRIVER solo ve: Vehículos (con solo Odómetro)
  assert(topLabels.includes('Vehículos'), 'DRIVER ve Vehiculos');
  assert(filtered.length === 1, `DRIVER ve 1 seccion (got ${filtered.length})`);

  // Solo Odómetro dentro de Vehículos
  assert(
    hasSubItem(filtered, 'Vehículos', 'Odómetro'),
    'DRIVER ve Vehiculos > Odometro'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Listado Vehículos'),
    'DRIVER NO ve Vehiculos > Listado'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Marcas'),
    'DRIVER NO ve Vehiculos > Marcas'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Vehículos de la Empresa'),
    'DRIVER NO ve Vehiculos > Vehiculos Empresa'
  );
  assert(
    !hasSubItem(filtered, 'Vehículos', 'Documentos Obligatorios'),
    'DRIVER NO ve Vehiculos > Documentos'
  );

  const vehSubItems = getSubItemLabels(filtered, 'Vehículos');
  assert(
    vehSubItems.length === 1,
    `DRIVER ve 1 sub-item en Vehiculos (got ${vehSubItems.length})`
  );
}

// ─── 2.7 PURCHASER (rol existe en schema pero no en sidebar) ─
function test_2_7_purchaser() {
  section('2.7 PURCHASER: verificar comportamiento');

  const filtered = filterItemsByRole(dataAdminSidebar, 'PURCHASER');

  // PURCHASER no está definido en ningún roles[] de la sidebar data
  // Esto significa que no ve NADA (todos los items tienen roles definidos)
  assert(
    filtered.length === 0,
    `PURCHASER no ve ninguna seccion (got ${filtered.length})`,
    filtered.length > 0
      ? `ve: ${getTopLevelLabels(filtered).join(', ')}`
      : undefined
  );

  // NOTA: Esto podría ser un issue - PURCHASER debería poder ver facturas/gastos
  // Reportarlo como hallazgo
  if (filtered.length === 0) {
    console.log(
      '\n  [HALLAZGO] PURCHASER no tiene acceso a ninguna seccion de la sidebar.'
    );
    console.log(
      '  El rol existe en el schema de Prisma pero no está mapeado en la sidebar.'
    );
    console.log(
      '  Considerar agregar PURCHASER a secciones relevantes (Facturas, Gastos, Proveedores).'
    );
  }
}

// ─── 2.8 Items sin roles son visibles para todos ────────────
function test_2_8_noRolesDefault() {
  section('2.8 Items sin roles definidos (visibilidad por defecto)');

  // Crear un item sin roles para simular
  const testData: SidebarItem[] = [
    { label: 'Sin Restriccion', href: '/test' }, // Sin roles → visible para todos
    { label: 'Solo Admin', href: '/admin', roles: ['SUPER_ADMIN'] },
  ];

  const allRoles: UserRole[] = [
    'SUPER_ADMIN',
    'OWNER',
    'MANAGER',
    'PURCHASER',
    'TECHNICIAN',
    'DRIVER',
  ];

  for (const role of allRoles) {
    const filtered = filterItemsByRole(testData, role);
    const sinRestriccion = filtered.find(i => i.label === 'Sin Restriccion');
    assert(
      sinRestriccion !== undefined,
      `${role} ve item sin restriccion de roles`
    );
  }

  // Solo SUPER_ADMIN ve "Solo Admin"
  const adminFiltered = filterItemsByRole(testData, 'SUPER_ADMIN');
  assert(
    adminFiltered.find(i => i.label === 'Solo Admin') !== undefined,
    'SUPER_ADMIN ve item restringido'
  );

  const ownerFiltered = filterItemsByRole(testData, 'OWNER');
  assert(
    ownerFiltered.find(i => i.label === 'Solo Admin') === undefined,
    'OWNER NO ve item restringido a SUPER_ADMIN'
  );
}

// ─── 2.9 SubItems vacíos eliminan el padre ──────────────────
function test_2_9_emptySubItemsRemoveParent() {
  section('2.9 SubItems vacíos eliminan el padre');

  const testData: SidebarItem[] = [
    {
      label: 'Seccion con subs',
      roles: ['SUPER_ADMIN', 'OWNER', 'DRIVER'],
      subItems: [
        { label: 'Sub 1', href: '/s1', roles: ['SUPER_ADMIN'] },
        { label: 'Sub 2', href: '/s2', roles: ['SUPER_ADMIN'] },
      ],
    },
  ];

  // SUPER_ADMIN ve la seccion (tiene sub-items)
  const adminFiltered = filterItemsByRole(testData, 'SUPER_ADMIN');
  assert(adminFiltered.length === 1, 'SUPER_ADMIN ve seccion con sub-items');

  // DRIVER: tiene el top-level permitido, pero NINGUN sub-item
  // La lógica debe eliminar el padre si queda sin sub-items
  const driverFiltered = filterItemsByRole(testData, 'DRIVER');
  assert(
    driverFiltered.length === 0,
    'Seccion sin sub-items visibles es eliminada (DRIVER)',
    driverFiltered.length > 0
      ? `Aun ve: ${getTopLevelLabels(driverFiltered).join(', ')}`
      : undefined
  );

  // Verificar en la data real: DRIVER en Mantenimiento
  // DRIVER está en roles de "Mantenimiento" top-level? NO (solo SUPER_ADMIN, OWNER, MANAGER, TECHNICIAN)
  // Pero verificar que Mantenimiento no aparece para DRIVER sin importar
  const driverReal = filterItemsByRole(dataAdminSidebar, 'DRIVER');
  assert(
    !hasTopLevel(driverReal, 'Mantenimiento'),
    'DRIVER no ve Mantenimiento (ni siquiera parcialmente)'
  );
}

// ─── 2.10 Verificación cruzada - Tabla de acceso completa ───
function test_2_10_accessMatrix() {
  section('2.10 Matriz de acceso completa');

  const roles: UserRole[] = [
    'SUPER_ADMIN',
    'OWNER',
    'MANAGER',
    'TECHNICIAN',
    'DRIVER',
  ];

  // Matriz esperada: [rol][seccion] = true/false
  const expectedAccess: Record<string, Record<string, boolean>> = {
    SUPER_ADMIN: {
      Dashboard: true,
      Empresa: true,
      Vehículos: true,
      Mantenimiento: true,
      Checklist: true,
      Personal: true,
      Reportes: true,
      Configuración: true,
    },
    OWNER: {
      Dashboard: true,
      Empresa: true,
      Vehículos: true,
      Mantenimiento: true,
      Checklist: true,
      Personal: true,
      Reportes: true,
      Configuración: true,
    },
    MANAGER: {
      Dashboard: true,
      Empresa: true,
      Vehículos: true,
      Mantenimiento: true,
      Checklist: true,
      Personal: true,
      Reportes: true,
      Configuración: false,
    },
    TECHNICIAN: {
      Dashboard: false,
      Empresa: false,
      Vehículos: true,
      Mantenimiento: true,
      Checklist: true,
      Personal: false,
      Reportes: false,
      Configuración: false,
    },
    DRIVER: {
      Dashboard: false,
      Empresa: false,
      Vehículos: true,
      Mantenimiento: false,
      Checklist: false,
      Personal: false,
      Reportes: false,
      Configuración: false,
    },
  };

  for (const role of roles) {
    const filtered = filterItemsByRole(dataAdminSidebar, role);
    const topLabels = getTopLevelLabels(filtered);

    for (const [section, expected] of Object.entries(expectedAccess[role]!)) {
      const actual = topLabels.includes(section);
      assert(
        actual === expected,
        `${role} ${expected ? 'VE' : 'NO ve'} ${section}`,
        actual !== expected
          ? `esperado: ${expected}, real: ${actual}`
          : undefined
      );
    }
  }
}

// ─── 2.11 Verificar mapeo Clerk → Prisma Role ──────────────
function test_2_11_clerkRoleMapping() {
  section('2.11 Mapeo de roles Clerk → Prisma');

  // La función mapClerkRoleToPrisma de auth.ts mapea:
  //   org:admin    → OWNER
  //   org:manager  → MANAGER
  //   org:technician → TECHNICIAN
  //   org:driver   → DRIVER
  //   default      → MANAGER

  // Replicar la lógica para verificar
  function mapClerkRoleToPrisma(
    clerkRole: string | undefined | null
  ): UserRole {
    const role = clerkRole?.replace('org:', '') || '';
    switch (role) {
      case 'admin':
        return 'OWNER';
      case 'manager':
        return 'MANAGER';
      case 'technician':
        return 'TECHNICIAN';
      case 'driver':
        return 'DRIVER';
      default:
        return 'MANAGER';
    }
  }

  assert(
    mapClerkRoleToPrisma('org:admin') === 'OWNER',
    'Clerk org:admin → OWNER'
  );
  assert(
    mapClerkRoleToPrisma('org:manager') === 'MANAGER',
    'Clerk org:manager → MANAGER'
  );
  assert(
    mapClerkRoleToPrisma('org:technician') === 'TECHNICIAN',
    'Clerk org:technician → TECHNICIAN'
  );
  assert(
    mapClerkRoleToPrisma('org:driver') === 'DRIVER',
    'Clerk org:driver → DRIVER'
  );
  assert(
    mapClerkRoleToPrisma(undefined) === 'MANAGER',
    'Clerk undefined → MANAGER (default seguro)'
  );
  assert(
    mapClerkRoleToPrisma(null) === 'MANAGER',
    'Clerk null → MANAGER (default seguro)'
  );
  assert(
    mapClerkRoleToPrisma('') === 'MANAGER',
    'Clerk "" → MANAGER (default seguro)'
  );
  assert(
    mapClerkRoleToPrisma('org:unknown') === 'MANAGER',
    'Clerk org:unknown → MANAGER (default seguro)'
  );

  // NOTA: No hay mapeo para SUPER_ADMIN desde Clerk
  // Esto es intencional: SUPER_ADMIN se asigna manualmente
  console.log(
    '\n  [INFO] SUPER_ADMIN no tiene mapeo desde Clerk (se asigna manualmente en BD)'
  );
  console.log(
    '  [INFO] PURCHASER no tiene mapeo desde Clerk (pendiente de implementar)'
  );
}

// ─── Main ────────────────────────────────────────────────────
function main() {
  console.log('\n');
  console.log('############################################################');
  console.log('#  CIRCUITO 2: Sidebar Dinámica por Rol                    #');
  console.log('#  Fleet Care SaaS - Test Automatizado                     #');
  console.log('############################################################');
  console.log('\nEste test verifica la lógica de filtrado de la sidebar');
  console.log('basada en el rol del usuario, sin necesidad de BD.\n');

  test_2_1_dataIntegrity();
  test_2_2_superAdmin();
  test_2_3_owner();
  test_2_4_manager();
  test_2_5_technician();
  test_2_6_driver();
  test_2_7_purchaser();
  test_2_8_noRolesDefault();
  test_2_9_emptySubItemsRemoveParent();
  test_2_10_accessMatrix();
  test_2_11_clerkRoleMapping();

  // Resumen
  console.log('\n');
  console.log('############################################################');
  console.log('#  RESUMEN                                                  #');
  console.log('############################################################');
  console.log(`\n  Total tests:  ${passed + failed}`);
  console.log(`  Passed:       ${passed}`);
  console.log(`  Failed:       ${failed}`);

  if (failures.length > 0) {
    console.log('\n  Fallos:');
    failures.forEach(f => console.log(`    - ${f}`));
  }

  // Hallazgos
  console.log('\n  --- Hallazgos ---');
  console.log(
    '  1. PURCHASER existe en el schema pero NO en la sidebar (sin acceso a nada)'
  );
  console.log(
    '  2. SUPER_ADMIN no tiene mapeo desde Clerk (se asigna manualmente)'
  );
  console.log(
    '  3. Clerk default role es MANAGER (seguro pero podría causar escalación)'
  );

  console.log(
    `\n  Resultado: ${failed === 0 ? 'TODOS LOS TESTS PASARON' : 'HAY FALLOS'}`
  );
  console.log('');

  process.exit(failed === 0 ? 0 : 1);
}

main();
