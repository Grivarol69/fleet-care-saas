import React from "react";
import { TypeList } from "./components/TypeList";

export default function CategoriesPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Lista de Tipos de Vehiculos</h1>
      <TypeList />
    </div>
  );
}
