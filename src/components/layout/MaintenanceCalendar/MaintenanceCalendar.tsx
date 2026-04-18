'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useMaintenanceSchedule } from '@/lib/hooks/useMaintenanceAlerts';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WorkOrderCreateWizard } from '@/components/maintenance/work-orders/WorkOrderCreateWizard';

type CalendarItem = {
  plate: string;
  itemName: string;
  type: 'scheduled' | 'estimated' | 'overdue';
  startTime?: string; // "HH:MM"
  endTime?: string;   // "HH:MM"
  notes?: string | null;
};

type CalendarContextMenu = {
  x: number;
  y: number;
  date: string; // "YYYY-MM-DD"
} | null;

export function MaintenanceCalendar() {
  const { data, isLoading } = useMaintenanceSchedule();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [contextMenu, setContextMenu] = useState<CalendarContextMenu>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardDate, setWizardDate] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  // Close context menu on outside click or Escape
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, day: number) => {
    e.preventDefault();
    const { year, month } = daysInMonth;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setContextMenu({ x: e.clientX, y: e.clientY, date: `${year}-${mm}-${dd}` });
  };

  // Calcular días del mes
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Domingo

    const days = [];

    // Días vacíos al inicio
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Días del mes
    for (let day = 1; day <= daysCount; day++) {
      days.push(day);
    }

    return { days, year, month };
  }, [currentDate]);

  // Extraer HH:MM de una ISO string si tiene hora distinta de medianoche UTC
  const extractTime = (isoString: string): string | undefined => {
    const d = new Date(isoString);
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 0 && m === 0) return undefined;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Agrupar eventos por día: capa sólida (WOs) + capa estimada (alertas)
  const alertsByDate = useMemo(() => {
    if (!data) return {} as Record<string, CalendarItem[]>;

    const grouped: Record<string, CalendarItem[]> = {};

    // Capa 1: WOs con fecha exacta
    data.scheduledWorkOrders.forEach(wo => {
      const woDate = new Date(wo.startDate);
      if (
        woDate.getFullYear() === daysInMonth.year &&
        woDate.getMonth() === daysInMonth.month
      ) {
        const dateKey = woDate.getDate().toString();
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({
          plate: wo.vehicle.licensePlate,
          itemName: wo.title,
          type: 'scheduled',
          startTime: extractTime(wo.startDate),
          endTime: wo.endDate ? extractTime(wo.endDate) : undefined,
          notes: wo.notes,
        });
      }
    });

    // Capa 2: alertas con fecha estimada (km/100 días)
    data.pendingAlerts.forEach(alert => {
      const daysToMaintenance = Math.floor(alert.kmToMaintenance / 100);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + daysToMaintenance);

      if (
        dueDate.getFullYear() === daysInMonth.year &&
        dueDate.getMonth() === daysInMonth.month
      ) {
        const dateKey = dueDate.getDate().toString();
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({
          plate: alert.vehiclePlate,
          itemName: alert.itemName,
          type: alert.kmToMaintenance <= 0 ? 'overdue' : 'estimated',
        });
      }
    });

    return grouped;
  }, [data, daysInMonth]);

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <h3 className="text-base font-semibold">
              Calendario de Vencimientos
            </h3>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              <h3 className="text-base font-semibold">
                Calendario de Vencimientos
              </h3>
            </div>
          </div>

          {/* Navegación de Mes */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-lg font-bold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendario */}
        <div className="p-4">
          {/* Días de la Semana */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-600 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del Mes */}
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.days.map((day, index) => {
              if (day === null) {
                return (
                  <div key={`empty-${index}`} className="h-20"></div>
                );
              }

              const dayItems = alertsByDate[day.toString()] || [];
              const hasItems = dayItems.length > 0;
              const hasOverdue = dayItems.some(i => i.type === 'overdue');
              const hasScheduled = dayItems.some(i => i.type === 'scheduled');
              const visibleItems = dayItems.slice(0, 2);
              const overflow = dayItems.length - 2;

              return (
                <div
                  key={day}
                  onContextMenu={e => handleContextMenu(e, day)}
                  className={`
                    h-20 rounded-lg border-2 p-1.5 transition-all hover:shadow-md cursor-context-menu
                    ${hasOverdue ? 'bg-red-50 border-red-400' : ''}
                    ${hasScheduled && !hasOverdue ? 'bg-blue-50 border-blue-400' : ''}
                    ${hasItems && !hasScheduled && !hasOverdue ? 'border-blue-300 bg-white' : ''}
                    ${!hasItems ? 'border-gray-200 bg-white' : ''}
                  `}
                >
                  <div className="flex flex-col h-full">
                    <span
                      className={`text-sm font-bold mb-1 ${
                        hasOverdue
                          ? 'text-red-600'
                          : hasItems
                            ? 'text-blue-600'
                            : 'text-gray-600'
                      }`}
                    >
                      {day}
                    </span>

                    {hasItems && (
                      <div className="flex-1 overflow-hidden">
                        <div className="space-y-0.5">
                          {visibleItems.map((item, i) => (
                            <div key={i}>
                              <Badge
                                className={`
                                  text-[10px] px-1 py-0 h-5 w-full justify-center truncate font-semibold
                                  ${item.type === 'overdue' ? 'bg-red-500 text-white' : ''}
                                  ${item.type === 'scheduled' ? 'bg-blue-500 text-white' : ''}
                                  ${item.type === 'estimated' ? 'bg-white text-blue-600 border border-blue-400' : ''}
                                `}
                              >
                                {item.plate}
                              </Badge>
                              {item.startTime && (
                                <p className="text-[10px] text-gray-500 text-center leading-tight mt-0.5">
                                  {item.startTime}{item.endTime ? ` - ${item.endTime}` : ''}
                                </p>
                              )}
                            </div>
                          ))}
                          {overflow > 0 && (
                            <p className="text-[10px] text-gray-500 text-center font-medium">
                              +{overflow} más
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-4 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-gray-600">Programado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-blue-400 bg-white"></div>
              <span className="text-gray-600">Estimado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span className="text-gray-600">Vencido</span>
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
          className="z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[160px]"
        >
          <button
            className="w-full text-left text-sm px-3 py-2 rounded hover:bg-gray-100 transition-colors"
            onClick={() => {
              setWizardDate(contextMenu.date);
              setContextMenu(null);
              setWizardOpen(true);
            }}
          >
            Nueva OT en este día
          </button>
        </div>
      )}

      {/* Quick Create Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Orden de Trabajo</DialogTitle>
          </DialogHeader>
          <WorkOrderCreateWizard
            defaultDate={wizardDate}
            onSuccess={() => setWizardOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
