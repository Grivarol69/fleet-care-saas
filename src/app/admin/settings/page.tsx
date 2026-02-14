import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-600">Ajustes generales de la plataforma</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuración General</CardTitle>
            <CardDescription>
              Ajustes de la plataforma Fleet Care
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Configuración próximamente...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorías de Mantenimiento</CardTitle>
            <CardDescription>Gestionar categorías globales</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Gestión de categorías próximamente...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items de Mantenimiento</CardTitle>
            <CardDescription>
              Gestionar items globales (preventivos y correctivos)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Gestión de items próximamente...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
