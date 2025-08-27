"use client";

import { Separator } from "@/components/ui/separator";

// import { dataGeneralSidebar, dataAdminSidebar } from "./SidebarSubRoutes.data";
import { dataAdminSidebar } from "./SidebarRoutes.data";
import { SidebarItems } from "../SidebarItems/SidebarItems";

export function SidebarRoutes() {
  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* <div className="p-2 md:p-6">
          <p className="mb-2 text-sm font-semibold text-slate-500">GENERAL</p>
          {dataGeneralSidebar.map((item) => (
            <SidebarSubItem key={item.label} item={item} />
          ))}
        </div>
        <Separator /> */}
        <div className="p-2 md:p-6">
          <p className="mb-2 text-sm font-semibold text-slate-500">MENÚ</p>
          {dataAdminSidebar.map((item) => (
            <SidebarItems key={item.label} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
