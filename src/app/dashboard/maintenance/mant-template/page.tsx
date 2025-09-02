import React from 'react';
import { MantTemplatesList } from './components/MantTemplatesList';

export default function MantTemplatesPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Templates de Mantenimiento</h1>
      <MantTemplatesList />
    </div>
  );
}