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
  Plug2,
  Landmark,
  Clock,
  Droplets,
  Disc3,
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
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.COORDINATOR,
    ], // TECHNICIAN y DRIVER no ven dashboard
  },
  {
    icon: Building2,
    label: 'Empresa',
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.COORDINATOR,
    ],
    subItems: [
      {
        label: 'Información',
        href: '/dashboard/empresa/informacion',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Configuración',
        icon: Settings,
        href: '/dashboard/empresa/configuracion',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Sucursales',
        href: '/dashboard/empresa/sucursales',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Integraciones',
        icon: Plug2,
        href: '/dashboard/empresa/integraciones/siigo',
        roles: [UserRole.OWNER, UserRole.MANAGER, UserRole.COORDINATOR],
      },
      {
        label: 'Centros de Costos',
        icon: Landmark,
        href: '/dashboard/cost-centers',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
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
      UserRole.COORDINATOR,
      UserRole.DRIVER,
    ],
    subItems: [
      {
        label: 'Vehículos',
        href: '/dashboard/vehicles/fleet',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
          UserRole.TECHNICIAN,
        ],
      },
      {
        label: 'Marcas',
        href: '/dashboard/vehicles/brands',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Líneas',
        href: '/dashboard/vehicles/lines',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Tipos',
        href: '/dashboard/vehicles/types',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Documentos Obligatorios',
        href: '/dashboard/vehicles/documents',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Odómetro',
        icon: Gauge,
        href: '/dashboard/vehicles/odometer',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
          UserRole.TECHNICIAN,
          UserRole.DRIVER,
        ],
      }, // Todos registran km
      {
        label: 'Vales de Combustible',
        icon: Droplets,
        href: '/dashboard/fuel/vouchers',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.PURCHASER,
        ],
      },
      {
        label: 'Neumáticos',
        icon: Disc3,
        href: '/dashboard/assets',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
          UserRole.TECHNICIAN,
        ],
      },
    ],
  },
  {
    icon: Wrench,
    label: 'Mantenimiento',
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.COORDINATOR,
      UserRole.PURCHASER,
      UserRole.TECHNICIAN,
    ],
    subItems: [
      {
        label: 'Master Items',
        href: '/dashboard/maintenance/mant-items',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Categorías',
        href: '/dashboard/maintenance/mant-categories',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Planes de Mantenimiento',
        href: '/dashboard/maintenance/mant-template',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Programas Vehículos',
        href: '/dashboard/maintenance/vehicle-programs',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Órdenes de Trabajo',
        href: '/dashboard/maintenance/work-orders',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
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
          UserRole.COORDINATOR,
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
          UserRole.COORDINATOR,
          UserRole.PURCHASER,
        ],
      },
      {
        label: 'KB Autopartes',
        icon: BookOpen,
        href: '/dashboard/maintenance/vehicle-parts',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Tempario',
        icon: Clock,
        href: '/dashboard/maintenance/tempario',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Alertas',
        href: '/dashboard/maintenance/alerts',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
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
      UserRole.COORDINATOR,
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
          UserRole.COORDINATOR,
          UserRole.PURCHASER,
        ],
      },
      {
        label: 'Stock',
        href: '/dashboard/inventory/stock',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
          UserRole.PURCHASER,
          UserRole.TECHNICIAN,
        ],
      },
      {
        label: 'Compras',
        href: '/dashboard/inventory/purchases',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
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
      UserRole.COORDINATOR,
      UserRole.TECHNICIAN,
    ],
    subItems: [
      {
        label: 'Crear',
        href: '/dashboard/checklist/crear',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Inspeccionar',
        href: '/dashboard/checklist/inspeccionar',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
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
          UserRole.COORDINATOR,
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
      UserRole.COORDINATOR,
      UserRole.PURCHASER,
    ],
    subItems: [
      {
        label: 'Técnicos',
        href: '/dashboard/people/technician',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Conductores',
        href: '/dashboard/people/driver',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Proveedores',
        href: '/dashboard/people/provider',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
          UserRole.PURCHASER,
        ],
      }, // PURCHASER gestiona proveedores
    ],
  },
  {
    icon: BarChart2,
    label: 'Reportes',
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.COORDINATOR,
    ],
    subItems: [
      {
        label: 'Costos',
        href: '/dashboard/reports/maintenance-costs',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      }, // TECHNICIAN no ve costos
      {
        label: 'Estado Flota',
        href: '/dashboard/reports/fleet-status',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Eficiencia',
        href: '/dashboard/reports/maintenance-efficiency',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
      {
        label: 'Combustible',
        icon: Droplets,
        href: '/dashboard/reports/fuel-analytics',
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.COORDINATOR,
        ],
      },
    ],
  },
  {
    icon: Settings,
    label: 'Configuración',
    roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.COORDINATOR], // Solo SUPER_ADMIN, OWNER y COORDINATOR gestionan usuarios y docs
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
        label: 'Auditoría',
        href: '/dashboard/admin/audit-log',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER],
      },
      {
        label: 'Watchdog de Precios',
        href: '/dashboard/admin/watchdog',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER],
      },
      {
        label: 'Tipos de Documento',
        icon: FileCheck,
        href: '/dashboard/admin/document-types',
        roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.COORDINATOR],
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
