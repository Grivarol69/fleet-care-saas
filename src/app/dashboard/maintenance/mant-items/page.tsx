import React from 'react';
import { MantItemsList } from './components/MantItemsList';

export default function CategoriesPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Master Items Mantenimiento</h1>
      <MantItemsList />
    </div>
  );
}
