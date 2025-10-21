'use client';

import { useState, useMemo } from 'react';
import { useMaintenanceAlerts } from '@/lib/hooks/useMaintenanceAlerts';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function MaintenanceCalendar() {
  const { data: alerts, isLoading } = useMaintenanceAlerts();
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Calcular días del mes
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

  // Agrupar alertas por fecha de vencimiento
  const alertsByDate = useMemo(() => {
    if (!alerts) return {};

    const grouped: Record<string, Array<{ plate: string; itemName: string; isOverdue: boolean }>> = {};

    alerts.forEach(alert => {
      // Calcular la fecha de vencimiento basada en currentKm y kmToMaintenance
      // Asumimos un promedio de 100 km/día para estimar
      const daysToMaintenance = Math.floor(alert.kmToMaintenance / 100);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + daysToMaintenance);

      // Solo mostrar alertas del mes actual
      if (
        dueDate.getFullYear() === daysInMonth.year &&
        dueDate.getMonth() === daysInMonth.month
      ) {
        const dateKey = dueDate.getDate().toString();
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push({
          plate: alert.vehiclePlate,
          itemName: alert.itemName,
          isOverdue: alert.kmToMaintenance <= 0,
        });
      }
    });

    return grouped;
  }, [alerts, daysInMonth]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <h3 className="text-base font-semibold">Calendario de Vencimientos</h3>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <h3 className="text-base font-semibold">Calendario de Vencimientos</h3>
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
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Días del Mes */}
        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square"></div>;
            }

            const dayAlerts = alertsByDate[day.toString()] || [];
            const hasAlerts = dayAlerts.length > 0;
            const hasOverdue = dayAlerts.some(a => a.isOverdue);

            return (
              <div
                key={day}
                className={`
                  aspect-square rounded-lg border-2 p-1 transition-all hover:shadow-md
                  ${hasOverdue ? 'bg-red-50 border-red-400' : ''}
                  ${hasAlerts && !hasOverdue ? 'bg-blue-50 border-blue-400' : ''}
                  ${!hasAlerts ? 'border-gray-200 bg-white' : ''}
                `}
              >
                <div className="flex flex-col h-full">
                  <span className={`text-xs font-bold mb-1 ${
                    hasOverdue ? 'text-red-600' :
                    hasAlerts ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {day}
                  </span>

                  {hasAlerts && (
                    <div className="flex-1 overflow-hidden">
                      <div className="space-y-0.5">
                        {dayAlerts.slice(0, 2).map((alert, i) => (
                          <Badge
                            key={i}
                            className={`
                              text-[8px] px-1 py-0 h-4 w-full justify-center truncate
                              ${alert.isOverdue ? 'bg-red-500' : 'bg-blue-500'}
                            `}
                          >
                            {alert.plate}
                          </Badge>
                        ))}
                        {dayAlerts.length > 2 && (
                          <p className="text-[8px] text-gray-600 text-center">
                            +{dayAlerts.length - 2}
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
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-gray-600">Vencido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-gray-600">Próximo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-gray-300"></div>
            <span className="text-gray-600">Sin alertas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
