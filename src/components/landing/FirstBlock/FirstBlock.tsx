import { Reveal } from "@/components/shared/Reveal";
import Image from "next/image";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function FirstBlock() {
  return (
    <div className="grid lg:grid-cols-2 lg:px-0 lg:py-24 items-center">
      <Reveal className="p-6 lg:pl-40" position="bottom">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold">
          Fleet-Care
          <span className="block">Software de</span> Mantenimiento
        </h1>
        <p className="text-lg mt-2 lg:mt-4 lg:text-xl max-w-sm">
          Software de mantenimiento de la flota vehicular de tu empresa
        </p>
        <div className="flex gap-x-4 mt-6">
          <Link href="/register">
            <Button>Empezar ahora</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Acceder al Dashboard</Button>
          </Link>
        </div>
      </Reveal>
      <Reveal className="flex justify-evenly" position="right">
        <Image
          src="/images/frangers-1.png"
          alt="Rent Cars"
          width={800}
          height={800}
          priority
        />
      </Reveal>
    </div>
  );
}