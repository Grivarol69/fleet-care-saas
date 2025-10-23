"use client";

import { useEffect, useState } from "react";
import { dataAdminSidebar } from "./SidebarRoutes.data";
import { SidebarItems } from "../SidebarItems/SidebarItems";
import { UserRole } from "@prisma/client";

export function SidebarRoutes() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener el usuario actual del endpoint
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.role) {
          setUserRole(data.role);
        }
      })
      .catch((error) => {
        console.error("Error fetching user:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Función para filtrar items según el rol del usuario
  const filterItemsByRole = (items: typeof dataAdminSidebar) => {
    return items
      .filter((item) => {
        // Si el item no tiene roles definidos, es visible para todos
        if (!item.roles) return true;
        // Si el usuario no tiene rol, no mostrar items con restricción
        if (!userRole) return false;
        // Verificar si el rol del usuario está en la lista de roles permitidos
        return item.roles.includes(userRole);
      })
      .map((item) => {
        // Si el item tiene subItems, filtrarlos también
        if (item.subItems) {
          return {
            ...item,
            subItems: item.subItems.filter((subItem) => {
              if (!subItem.roles) return true;
              if (!userRole) return false;
              return subItem.roles.includes(userRole);
            }),
          };
        }
        return item;
      })
      // Filtrar items que quedaron sin subItems
      .filter((item) => !item.subItems || item.subItems.length > 0);
  };

  const filteredItems = filterItemsByRole(dataAdminSidebar);

  if (loading) {
    return (
      <div className="flex flex-col justify-between h-full">
        <div className="p-2 md:p-6">
          <p className="mb-2 text-sm font-semibold text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="p-2 md:p-6">
          <p className="mb-2 text-sm font-semibold text-slate-500">
            MENÚ {userRole && <span className="text-xs text-slate-400">({userRole})</span>}
          </p>
          {filteredItems.map((item) => (
            <SidebarItems key={item.label} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
