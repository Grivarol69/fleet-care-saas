import React from "react";
import { VehicleTemplateList } from "./components/VehicleTemplateList";

export default function VehicleTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Plantillas de Mantenimiento por Vehículo
        </h1>
        <p className="text-muted-foreground">
          Asigna planes de mantenimiento a vehículos específicos de tu flota
        </p>
      </div>
      <VehicleTemplateList />
    </div>
  );
}