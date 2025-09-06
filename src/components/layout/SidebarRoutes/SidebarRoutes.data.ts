import {
    LayoutDashboard,
    Building2,
    Truck,
    Wrench,
    ClipboardCheck,
    Users,
    ShoppingBag,
    BarChart2,
    Settings,
} from "lucide-react";

export const dataAdminSidebar = [
    {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/dashboard",
    },
    {
        icon: Building2,
        label: "Empresa",
        subItems: [
            { label: "Información", href: "/dashboard/empresa/informacion" },
            {
                label: "Configuración",
                icon: Settings,
                href: "/dashboard/empresa/configuracion",
            },
            { label: "Sucursales", href: "/dashboard/empresa/sucursales" },
        ],
    },
    {
        icon: Truck,
        label: "Vehículos",
        subItems: [
            { label: "Listado Vehículos", href: "/dashboard/vehicles/fleet" },
            { label: "Marcas", href: "/dashboard/vehicles/brands" },
            { label: "Líneas", href: "/dashboard/vehicles/lines" },
            { label: "Tipos", href: "/dashboard/vehicles/types" },
            { label: "Vehículos de la Empresa", href: "/dashboard/vehicles/vehicles" },
            { label: "Documentos Obligatorios", href: "/dashboard/vehicles/documents" },
            { label: "Odómetro", href: "/dashboard/vehicles/odometer" },
        ],
    },
    {
        icon: Wrench,
        label: "Mantenimiento",
        subItems: [
            { label: "Master Items", href: "/dashboard/maintenance/mant-items" },
            { label: "Categorías", href: "/dashboard/maintenance/mant-categories" },
            { label: "Plantillas Planes Mantenimiento", href: "/dashboard/maintenance/mant-template" },
            { label: "Planes Vehículos", href: "/dashboard/maintenance/vehicle-template" },
            { label: "Órdenes de Trabajo", href: "/dashboard/maintenance/work-orders" },
            { label: "Alertas", href: "/dashboard/maintenance/alerts" },
        ],
    },
    {
        icon: ClipboardCheck,
        label: "Checklist",
        subItems: [
            { label: "Crear", href: "/dashboard/checklist/crear" },
            { label: "Inspeccionar", href: "/dashboard/checklist/inspeccionar" },
            { label: "Historial", href: "/dashboard/checklist/historial" },
        ],
    },
    {
        icon: Users,
        label: "Personal",
        subItems: [
            { label: "Técnicos", href: "/dashboard/people/technicians" },
            { label: "Conductores", href: "/dashboard/people/drivers" },
            { label: "Agregar", href: "/dashboard/people/add" },
        ],
    },
    {
        icon: ShoppingBag,
        label: "Proveedores",
        subItems: [
            { label: "Listado", href: "/dashboard/people/providers" },
            { label: "Agregar", href: "/dashboard/people/providers/add" },
            { label: "Categorías", href: "/dashboard/people/provider-categories" },
        ],
    },
    {
        icon: BarChart2,
        label: "Reportes",
        subItems: [
            { label: "Costos", href: "/dashboard/reports/maintenance-costs" },
            { label: "Estado Flota", href: "/dashboard/reports/fleet-status" },
            { label: "Eficiencia", href: "/dashboard/reports/maintenance-efficiency" },
        ],
    },
    {
        icon: Settings,
        label: "Configuración",
        subItems: [
            { label: "Tenant", href: "/dashboard/admin/tenant" },
            { label: "Users", href: "/dashboard/admin/users" },
            { label: "Roles", href: "/dashboard/admin/roles" },
            { label: "Permisos", href: "/dashboard/admin/permissions" },
        ],
    },
];