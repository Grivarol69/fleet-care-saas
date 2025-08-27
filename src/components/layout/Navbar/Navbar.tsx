import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Menu } from "lucide-react";
import { SidebarRoutes } from "../SidebarRoutes";
import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <nav className="flex items-center justify-between w-full h-20 px-2 border-b gap-x-4 md:px-6 bg-background">
      <div className="block xl:hidden">
        <Sheet>
          <SheetTrigger className="flex items-center">
            <Menu />
          </SheetTrigger>
          <SheetContent side="left">
            <SidebarRoutes />
          </SheetContent>
        </Sheet>
      </div>
      <div className="flex items-center justify-end w-full gap-x-2">
        <div className="flex items-center justify-between w-full max-w-5xl py-5 mx-auto gap-x-2">
          <Link href="/" className="flex items-center justify-center gap-x-2">
            <Image src="/logo.svg" alt="logo" width={50} height={50} />
            {/* <span className="text-xl font-bold">Fleet-Care</span> */}
          </Link>
          <Link href="/vehicles/odometer" className="text-1xl font-bold">
            Odómetro
          </Link>
          <Link href="/vehicles/fleet" className="text-1xl font-bold">
            Lista de Vehículos
          </Link>
          <Link href="/dashboard" className="text-1xl font-bold">
            Dashboard
          </Link>
        </div>
        {/*<UserButton />*/}
      </div>
    </nav>
  );
}
