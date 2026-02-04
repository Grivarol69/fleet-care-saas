import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
// Actually, I can't import columns if they don't exist. I should create a simple client component or just a placeholder.
// Let's create a placeholder Client Component for the list.

export default async function MasterPartsPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/sign-in");
    }

    // Fetch parts
    const parts = await prisma.masterPart.findMany({
        where: {
            isActive: true,
            OR: [
                { tenantId: null },
                { tenantId: user.tenantId }
            ]
        },
        include: {
            inventoryItems: {
                where: { tenantId: user.tenantId }
            }
        },
        orderBy: { description: 'asc' }
    });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Catálogo de Partes</h1>
                {/* Button to add would go here */}
            </div>

            <div className="bg-white rounded-md border p-4">
                {parts.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">No hay partes registradas.</p>
                ) : (
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Código</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Descripción</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Categoría</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Unidad</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Precio Ref.</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Origen</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {parts.map((part) => (
                                    <tr key={part.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">{part.code}</td>
                                        <td className="p-4 align-middle">{part.description}</td>
                                        <td className="p-4 align-middle">{part.category}</td>
                                        <td className="p-4 align-middle">{part.unit}</td>
                                        <td className="p-4 align-middle">
                                            {part.referencePrice ?
                                                new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(Number(part.referencePrice))
                                                : '-'}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {part.tenantId ?
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">Local</span>
                                                :
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">Global</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>

    );
}
