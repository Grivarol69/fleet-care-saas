import {
  LayoutDashboard,
  Building2,
  Truck,
  Wrench,
  ClipboardCheck,
  Users,
  BarChart2,
  Settings,
  Gauge,
  FileText,
  FileCheck,
  Package,
  ShoppingCart,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

import { UserRole } from '@prisma/client';

type SidebarItem = {
  icon: LucideIcon;
  label: string;
  href?: string;
  subItems?: {
    label: string;
    icon?: LucideIcon;
    href: string;
    roles?: UserRole[];
  }[];
  roles?: UserRole[]; // Roles que pueden ver este item
};

export const dataAdminSidebar: SidebarItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/dashboard',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER], // TECHNICIAN y DRIVER no ven dashboard
  },
  {
    icon: Building2,
    label: 'Empresa',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
    subItems: [
      {
        label: 'Información',
        href: '/dashboard/empresa/informacion',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Configuración',
        icon: Settings,
        href: '/dashboard/empresa/configuracion',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Sucursales',
        href: '/dashboard/empresa/sucursales',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
    ],
  },
  {
    icon: Truck,
    label: 'Vehículos',
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.TECHNICIAN,
      UserRole.DRIVER,
    ],
    subItems: [
      {
        label: 'Listado Vehículos',
        href: '/dashboard/vehicles/fleet',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.TECHNICIAN,
        ],
      },
      {
        label: 'Marcas',
        href: '/dashboard/vehicles/brands',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Líneas',
        href: '/dashboard/vehicles/lines',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Tipos',
        href: '/dashboard/vehicles/types',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Vehículos de la Empresa',
        href: '/dashboard/vehicles/vehicles',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Documentos Obligatorios',
        href: '/dashboard/vehicles/documents',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Odómetro',
        icon: Gauge,
        href: '/dashboard/vehicles/odometer',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.TECHNICIAN,
          UserRole.DRIVER,
        ],
      }, // Todos registran km
    ],
  },
  {
    icon: Wrench,
    label: 'Mantenimiento',
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.PURCHASER,
      UserRole.TECHNICIAN,
    ],
    subItems: [
      {
        label: 'Master Items',
        href: '/dashboard/maintenance/mant-items',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Categorías',
        href: '/dashboard/maintenance/mant-categories',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Plantillas Planes Mantenimiento',
        href: '/dashboard/maintenance/mant-template',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Paquetes de Mantenimiento',
        icon: ClipboardCheck,
        href: '/dashboard/maintenance/packages',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Programas Vehículos',
        href: '/dashboard/maintenance/vehicle-programs',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Órdenes de Trabajo',
        href: '/dashboard/maintenance/work-orders',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.PURCHASER,
          UserRole.TECHNICIAN,
        ],
      }, // TECHNICIAN ejecuta OT, PURCHASER ve para gestión de compras
      {
        label: 'Facturas',
        icon: FileText,
        href: '/dashboard/invoices',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.PURCHASER,
        ],
      }, // PURCHASER gestiona facturas
      {
        label: 'Órdenes Compra',
        icon: ShoppingCart,
        href: '/dashboard/purchase-orders',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.PURCHASER,
        ],
      },
      {
        label: 'KB Autopartes',
        icon: BookOpen,
        href: '/dashboard/maintenance/vehicle-parts',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Alertas',
        href: '/dashboard/maintenance/alerts',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.TECHNICIAN,
        ],
      },
    ],
  },
  {
    icon: Package,
    label: 'Inventario',
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.PURCHASER,
      UserRole.TECHNICIAN,
    ],
    subItems: [
      {
        label: 'Catálogo de Partes',
        href: '/dashboard/inventory/parts',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.PURCHASER,
        ],
      },
      {
        label: 'Compras',
        href: '/dashboard/inventory/purchases/new',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.PURCHASER,
        ],
      }, // PURCHASER gestiona compras
    ],
  },
  {
    icon: ClipboardCheck,
    label: 'Checklist',
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.TECHNICIAN,
    ],
    subItems: [
      {
        label: 'Crear',
        href: '/dashboard/checklist/crear',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Inspeccionar',
        href: '/dashboard/checklist/inspeccionar',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.TECHNICIAN,
        ],
      },
      {
        label: 'Historial',
        href: '/dashboard/checklist/historial',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.TECHNICIAN,
        ],
      },
    ],
  },
  {
    icon: Users,
    label: 'Personal',
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.PURCHASER,
    ],
    subItems: [
      {
        label: 'Técnicos',
        href: '/dashboard/people/technician',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Conductores',
        href: '/dashboard/people/driver',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Proveedores',
        href: '/dashboard/people/provider',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.PURCHASER,
        ],
      }, // PURCHASER gestiona proveedores
    ],
  },
  {
    icon: BarChart2,
    label: 'Reportes',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
    subItems: [
      {
        label: 'Costos',
        href: '/dashboard/reports/maintenance-costs',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      }, // TECHNICIAN no ve costos
      {
        label: 'Estado Flota',
        href: '/dashboard/reports/fleet-status',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Eficiencia',
        href: '/dashboard/reports/maintenance-efficiency',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
    ],
  },
  {
    icon: Settings,
    label: 'Configuración',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER], // Solo SUPER_ADMIN y OWNER gestionan usuarios
    subItems: [
      {
        label: 'Tenant',
        href: '/dashboard/admin/tenant',
        roles: [UserRole.SUPER_ADMIN],
      },
      {
        label: 'Users',
        href: '/dashboard/admin/users',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER],
      },
      {
        label: 'Tipos de Documento',
        icon: FileCheck,
        href: '/dashboard/admin/document-types',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER],
      },
      {
        label: 'Roles',
        href: '/dashboard/admin/roles',
        roles: [UserRole.SUPER_ADMIN],
      },
      {
        label: 'Permisos',
        href: '/dashboard/admin/permissions',
        roles: [UserRole.SUPER_ADMIN],
      },
    ],
  },
];
