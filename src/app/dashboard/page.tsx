// src/app/dashboard/page.tsx - Fleet Care SaaS
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentStats } from '@/components/layout/DocumentStats';
import { FleetStatusBoard } from '@/components/dashboard';
import { FinancialDashboard } from '@/components/dashboard/FinancialDashboard';
import { WorkOrdersTab } from '@/components/dashboard/WorkOrdersTab';
import { BarChart3, Truck, FileText, ClipboardList, Calendar } from 'lucide-react';
import { MaintenanceCalendar } from '@/components/layout/MaintenanceCalendar/MaintenanceCalendar';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="financial" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Situación Financiera</span>
            <span className="sm:hidden">Financiero</span>
          </TabsTrigger>
          <TabsTrigger value="fleet" className="gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Estado de Flota</span>
            <span className="sm:hidden">Flota</span>
          </TabsTrigger>
          <TabsTrigger value="work-orders" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Órdenes de Trabajo</span>
            <span className="sm:hidden">OTs</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendario</span>
            <span className="sm:hidden">Cal</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Situación Financiera */}
        <TabsContent value="financial" className="mt-6">
          <FinancialDashboard />
        </TabsContent>

        {/* Tab 2: Estado de Flota */}
        <TabsContent value="fleet" className="mt-6">
          <div className="space-y-6">
            <FleetStatusBoard />
          </div>
        </TabsContent>

        {/* Tab 3: Órdenes de Trabajo */}
        <TabsContent value="work-orders" className="mt-6">
          <WorkOrdersTab />
        </TabsContent>

        {/* Tab 4: Documentos */}
        <TabsContent value="documents" className="mt-6">
          <DocumentStats />
        </TabsContent>

        {/* Tab 5: Calendario de Mantenimiento */}
        <TabsContent value="schedule" className="mt-6">
          <MaintenanceCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
