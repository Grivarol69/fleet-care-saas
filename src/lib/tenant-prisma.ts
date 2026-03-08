import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

// Extraer metadatos una sola vez al inicio
const models = Prisma.dmmf.datamodel.models;
const tenantModels = new Set(
    models.filter((m) => m.fields.some((f) => f.name === 'tenantId')).map((m) => m.name)
);
const globalModels = new Set(
    models.filter((m) => m.fields.some((f) => f.name === 'isGlobal')).map((m) => m.name)
);

export function getTenantPrisma(tenantId: string) {
    if (!tenantId) {
        throw new Error(
            'getTenantPrisma requires a valid tenantId. For platform operations without tenant scope, use the base prisma client.'
        );
    }

    return prisma.$extends({
        name: 'tenant-isolation',
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    if (!model || !tenantModels.has(model)) {
                        return query(args);
                    }

                    const isGlobalModel = globalModels.has(model);
                    // Clonamos de forma segura sin JSON.parse para no romper objetos tipo Date o Decimal
                    const argsClone: any = args ? { ...args } : {};

                    // 1. Operaciones de ESCRITURA (create, createMany)
                    if (operation === 'create') {
                        argsClone.data = { ...(argsClone.data as any), tenantId };
                        return query(argsClone);
                    }
                    if (operation === 'createMany') {
                        if (Array.isArray(argsClone.data)) {
                            argsClone.data = argsClone.data.map((d: any) => ({ ...d, tenantId }));
                        } else if (argsClone.data) {
                            argsClone.data = { ...(argsClone.data as any), tenantId };
                        }
                        return query(argsClone);
                    }

                    // 2. Operaciones de LECTURA (findMany, findFirst, count, aggregate, groupBy)
                    // y clonación de conditions para validaciones
                    argsClone.where = argsClone.where ? { ...argsClone.where } : {};

                    const isReadOperation = [
                        'findMany',
                        'findFirst',
                        'findFirstOrThrow',
                        'count',
                        'aggregate',
                        'groupBy',
                    ].includes(operation as string);

                    if (isGlobalModel && isReadOperation) {
                        // Models con isGlobal: leer global O tenant
                        const originalWhere = (args as any).where || {};
                        if (Object.keys(originalWhere).length === 0) {
                            argsClone.where = { OR: [{ tenantId }, { isGlobal: true }] };
                        } else {
                            argsClone.where = { AND: [originalWhere, { OR: [{ tenantId }, { isGlobal: true }] }] };
                        }
                    } else {
                        // Models normales o escrituras a globales: restringir estricto a tenant
                        (argsClone.where as any).tenantId = tenantId;
                    }

                    // Ejecutar lecturas normales
                    if (isReadOperation) {
                        return query(argsClone);
                    }

                    // 3. Operaciones que requieren restricciones Unique (findUnique, update, delete, upsert)
                    if (operation === 'findUnique') {
                        return query(argsClone);
                    }
                    if (operation === 'findUniqueOrThrow') {
                        return query(argsClone);
                    }

                    if (operation === 'update') {
                        if (argsClone.data && (argsClone.data as any).tenantId) {
                            delete (argsClone.data as any).tenantId;
                        }
                        return query(argsClone);
                    }

                    if (operation === 'delete') {
                        return query(argsClone);
                    }

                    if (operation === 'upsert') {
                        // Create receives tenantId; Update does not modify it.
                        // args.create se clonó superficialmente en argsClone, hay que reasignar para evitar mutar el original
                        argsClone.create = argsClone.create ? { ...(argsClone.create as any), tenantId } : { tenantId };
                        if (argsClone.update && (argsClone.update as any).tenantId) {
                            delete (argsClone.update as any).tenantId;
                        }
                        return query(argsClone);
                    }

                    if (operation === 'updateMany') {
                        argsClone.data = { ...(argsClone.data as any) };
                        delete (argsClone.data as any).tenantId; // Evitar que modifiquen el tenant
                        return query(argsClone);
                    }

                    if (operation === 'deleteMany') {
                        return query(argsClone);
                    }

                    return query(argsClone);
                },
            },
        },
    });
}
