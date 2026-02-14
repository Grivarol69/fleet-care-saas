'use client';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  Menu,
  Gauge,
  Car,
  Bell,
  Wrench,
  Search,
  AlertTriangle,
  FileBarChart,
} from 'lucide-react';
import { UserButton, OrganizationSwitcher } from '@clerk/nextjs';
import { SidebarRoutes } from '../SidebarRoutes';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavbarStats {
  totalVehicles: number;
  criticalAlerts: number;
  openWorkOrders: number;
  monthCosts: string;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState<NavbarStats>({
    totalVehicles: 0,
    criticalAlerts: 0,
    openWorkOrders: 0,
    monthCosts: '0',
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch navbar stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/navbar-stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching navbar stats:', error);
      }
    };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/vehicles/fleet?search=${searchQuery}`);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="flex items-center justify-between w-full border-b bg-background">
      {/* Mobile menu */}
      <div className="block xl:hidden px-4 py-3">
        <Sheet>
          <SheetTrigger className="flex items-center">
            <Menu />
          </SheetTrigger>
          <SheetContent side="left">
            <SidebarRoutes />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop navbar */}
      <div className="hidden xl:flex items-center justify-between w-full px-6 py-3">
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            {/* Odómetro */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    isActive('/dashboard/vehicles/odometer')
                      ? 'default'
                      : 'ghost'
                  }
                  size="sm"
                  onClick={() => router.push('/dashboard/vehicles/odometer')}
                  className="gap-2"
                >
                  <Gauge className="h-4 w-4" />
                  Registrar Km
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Registrar lectura del odómetro</p>
              </TooltipContent>
            </Tooltip>

            {/* Flota */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    isActive('/dashboard/vehicles/fleet') ? 'default' : 'ghost'
                  }
                  size="sm"
                  onClick={() => router.push('/dashboard/vehicles/fleet')}
                  className="gap-2"
                >
                  <Car className="h-4 w-4" />
                  Flota
                  {stats.totalVehicles > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {stats.totalVehicles}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver lista completa de vehículos</p>
              </TooltipContent>
            </Tooltip>

            {/* Alertas */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    isActive('/dashboard/maintenance/alerts')
                      ? 'default'
                      : 'ghost'
                  }
                  size="sm"
                  onClick={() => router.push('/dashboard/maintenance/alerts')}
                  className="gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Alertas
                  {stats.criticalAlerts > 0 && (
                    <Badge variant="destructive" className="ml-1 animate-pulse">
                      {stats.criticalAlerts}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Alertas de mantenimiento{' '}
                  {stats.criticalAlerts > 0 && '(¡Críticas!)'}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Órdenes de Trabajo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    isActive('/dashboard/maintenance/work-orders')
                      ? 'default'
                      : 'ghost'
                  }
                  size="sm"
                  onClick={() =>
                    router.push('/dashboard/maintenance/work-orders')
                  }
                  className="gap-2"
                >
                  <Wrench className="h-4 w-4" />
                  Órdenes
                  {stats.openWorkOrders > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {stats.openWorkOrders}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Órdenes de trabajo abiertas</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Dashboard */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive('/dashboard') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="gap-2"
                >
                  <FileBarChart className="h-4 w-4" />
                  Dashboard
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Vista general y reportes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Búsqueda rápida */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar vehículo..."
              className="pl-8 w-[200px] h-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* Org Switcher + User */}
        <div className="flex items-center gap-3">
          <OrganizationSwitcher
            hidePersonal={false}
            afterSelectOrganizationUrl="/dashboard"
            afterSelectPersonalUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'flex items-center',
                organizationSwitcherTrigger:
                  'px-3 py-1.5 rounded-md border border-input bg-background text-sm hover:bg-accent',
              },
            }}
          />

          <Separator orientation="vertical" className="h-6" />

          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-9 h-9',
              },
            }}
          />
        </div>
      </div>

      {/* Mobile simplified navbar */}
      <div className="flex xl:hidden items-center justify-between w-full px-4 py-3 gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/vehicles/fleet')}
          >
            <Car className="h-4 w-4 mr-1" />
            <Badge variant="secondary">{stats.totalVehicles}</Badge>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/maintenance/alerts')}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            {stats.criticalAlerts > 0 && (
              <Badge variant="destructive">{stats.criticalAlerts}</Badge>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <OrganizationSwitcher
            hidePersonal={false}
            afterSelectOrganizationUrl="/dashboard"
            afterSelectPersonalUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'flex items-center',
                organizationSwitcherTrigger:
                  'px-2 py-1 rounded-md border border-input bg-background text-xs',
              },
            }}
          />
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
              },
            }}
          />
        </div>
      </div>
    </nav>
  );
}
