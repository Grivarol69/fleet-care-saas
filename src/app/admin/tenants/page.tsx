import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function TenantsPage() {
  // Obtener todos los tenants con conteo de usuarios y vehículos
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          users: true,
          vehicles: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Tenants</h1>
        <p className="text-slate-600">Gestión de organizaciones en la plataforma</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Tenants</CardTitle>
          <CardDescription>
            {tenants.length} organizaciones registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Usuarios</TableHead>
                <TableHead className="text-center">Vehículos</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="text-slate-500">{tenant.slug}</TableCell>
                  <TableCell>{tenant.country || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={tenant.subscriptionStatus === 'ACTIVE' ? 'default' : 'secondary'}
                    >
                      {tenant.subscriptionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{tenant._count.users}</TableCell>
                  <TableCell className="text-center">{tenant._count.vehicles}</TableCell>
                  <TableCell className="text-slate-500">
                    {format(tenant.createdAt, 'dd MMM yyyy', { locale: es })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
