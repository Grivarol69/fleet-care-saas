import React from "react";
import { DocumentTypeList } from "./components/DocumentTypeList";

export default function DocumentTypesPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Tipos de Documento</h1>
      <p className="text-gray-600 mb-6">
        Gestione los tipos de documento disponibles para los vehículos de su flota.
        Los tipos globales son visibles para todos los tenants del mismo país.
      </p>
      <DocumentTypeList />
    </div>
  );
}
