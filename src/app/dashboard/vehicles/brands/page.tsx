import React from 'react';
import { BrandList } from './components/BrandList';

export default function CategoriesPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Lista de Marcas</h1>
      <BrandList />
    </div>
  );
}
