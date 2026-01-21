// src/app/dashboard/page.tsx - Fleet Care SaaS
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentStats } from '@/components/layout/DocumentStats';
import { MaintenanceCalendar } from '@/components/layout/MaintenanceCalendar';
import { FleetStatusBoard } from '@/components/dashboard';
import { FinancialDashboard } from '@/components/dashboard/FinancialDashboard';
import { BarChart3, Truck, Calendar, FileText } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="fleet" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="fleet" className="gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Estado de Flota</span>
            <span className="sm:hidden">Flota</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Situación Financiera</span>
            <span className="sm:hidden">Financiero</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendario</span>
            <span className="sm:hidden">Agenda</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Estado de Flota */}
        <TabsContent value="fleet" className="mt-6">
          <FleetStatusBoard />
        </TabsContent>

        {/* Tab 2: Situación Financiera */}
        <TabsContent value="financial" className="mt-6">
          <FinancialDashboard />
        </TabsContent>

        {/* Tab 3: Calendario */}
        <TabsContent value="calendar" className="mt-6">
          <div className="max-w-4xl mx-auto">
            <MaintenanceCalendar />
          </div>
        </TabsContent>

        {/* Tab 4: Documentos */}
        <TabsContent value="documents" className="mt-6">
          <DocumentStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}
