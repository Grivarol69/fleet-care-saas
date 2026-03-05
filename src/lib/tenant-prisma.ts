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
                    const argsClone = args ? { ...args } : {};

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
                        const originalWhere = args.where || {};
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
                        return (prisma as any)[model].findFirst(argsClone);
                    }
                    if (operation === 'findUniqueOrThrow') {
                        return (prisma as any)[model].findFirstOrThrow(argsClone);
                    }

                    if (operation === 'update') {
                        const record = await (prisma as any)[model].findFirst({ where: argsClone.where });
                        if (!record) throw new Error('Record not found or not authorized');

                        // Validado. Ejecutamos el update original con args.
                        if (args.data && (args.data as any).tenantId) {
                            delete (args.data as any).tenantId;
                        }
                        return query(args);
                    }

                    if (operation === 'delete') {
                        const record = await (prisma as any)[model].findFirst({ where: argsClone.where });
                        if (!record) throw new Error('Record not found or not authorized');
                        return query(args);
                    }

                    if (operation === 'upsert') {
                        const record = await (prisma as any)[model].findFirst({ where: argsClone.where });
                        if (record) {
                            // Update usando query original para no romper unique index
                            if (args.update && (args.update as any).tenantId) {
                                delete (args.update as any).tenantId;
                            }
                            return query(args);
                        } else {
                            // Create. Evitando upsert porque Prisma inyecta `where` params al update/create.
                            const createData = { ...(args.create as any), tenantId };
                            return (prisma as any)[model].create({ data: createData });
                        }
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
