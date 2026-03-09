import { TemparioList } from './components/TemparioList';

export default function TemparioPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Administración de Tempario</h1>
      <TemparioList />
    </div>
  );
}
