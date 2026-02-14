import React from 'react';
import { LineList } from './components/LineList';

export default function CategoriesPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Lista de Lineas de Vehículos</h1>
      <LineList />
    </div>
  );
}
