"use client";

import { useEffect, useState } from "react";
import { dataAdminSidebar } from "./SidebarRoutes.data";
import { SidebarItems } from "../SidebarItems/SidebarItems";
import { UserRole } from "@prisma/client";

export function SidebarRoutes() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.role) {
          setUserRole(data.role);
        }
        if (data.isSuperAdmin) {
          setIsSuperAdmin(true);
        }
      })
      .catch((error) => {
        console.error("Error fetching user:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const hasAccess = (roles: UserRole[] | undefined): boolean => {
    if (!roles) return true;
    if (!userRole) return false;
    // Si es SUPER_ADMIN de plataforma, tiene acceso a items marcados como SUPER_ADMIN
    // (su role en el tenant es OWNER, pero isSuperAdmin=true)
    if (isSuperAdmin && roles.includes(UserRole.SUPER_ADMIN)) return true;
    return roles.includes(userRole);
  };

  const filterItemsByRole = (items: typeof dataAdminSidebar) => {
    return items
      .filter((item) => hasAccess(item.roles))
      .map((item) => {
        if (item.subItems) {
          return {
            ...item,
            subItems: item.subItems.filter((subItem) => hasAccess(subItem.roles)),
          };
        }
        return item;
      })
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
