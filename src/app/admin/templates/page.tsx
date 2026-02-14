import { prisma } from '@/lib/prisma';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function TemplatesPage() {
  // Obtener templates globales con sus paquetes
  const templates = await prisma.maintenanceTemplate.findMany({
    where: {
      isGlobal: true,
    },
    include: {
      brand: true,
      line: true,
      packages: {
        orderBy: {
          triggerKm: 'asc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Templates Globales
        </h1>
        <p className="text-slate-600">
          Plantillas de mantenimiento disponibles para todos los tenants
        </p>
      </div>

      <div className="grid gap-6">
        {templates.map(template => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>
                    {template.brand?.name} {template.line?.name} - v
                    {template.version}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant={
                      template.status === 'ACTIVE' ? 'default' : 'secondary'
                    }
                  >
                    {template.status}
                  </Badge>
                  {template.isDefault && (
                    <Badge variant="outline">Por defecto</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                {template.description}
              </p>

              <div className="mb-2">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                  Paquetes de Mantenimiento ({template.packages.length})
                </h4>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Kilometraje</TableHead>
                    <TableHead className="text-right">Costo Est.</TableHead>
                    <TableHead className="text-right">Tiempo Est.</TableHead>
                    <TableHead>Prioridad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {template.packages.map(pkg => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell className="text-right">
                        {pkg.triggerKm?.toLocaleString() ?? '-'} km
                      </TableCell>
                      <TableCell className="text-right">
                        ${pkg.estimatedCost?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {pkg.estimatedTime ? `${pkg.estimatedTime}h` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pkg.priority === 'HIGH'
                              ? 'destructive'
                              : pkg.priority === 'MEDIUM'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {pkg.priority}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
