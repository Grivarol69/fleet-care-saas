import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCurrentUser } from '@/lib/auth';
import { mapItemsToMantItems } from '@/lib/ai/mant-mapper';
import type { MantMapperCandidate } from '@/lib/ai/mant-mapper.types';

const mantMapperItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

const mantMapperBodySchema = z.object({
  items: z.array(mantMapperItemSchema).min(1).max(100),
});

export async function POST(request: Request): Promise<Response> {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof mantMapperBodySchema>;
  try {
    const raw = await request.json();
    const parsed = mantMapperBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 422 }
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Fetch MantItem candidates server-side
  const rawCandidates = await tenantPrisma.mantItem.findMany({
    where: {
      OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      status: 'ACTIVE',
    },
    include: { category: true },
    take: 100, // threshold: if catalog > 100, take first 100
  });

  const candidates: MantMapperCandidate[] = rawCandidates.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    categoryName: item.category.name,
  }));

  // Call mapper — never fails to caller (returns null-mappings on error)
  const outcome = await mapItemsToMantItems(body.items, candidates);

  return NextResponse.json({ mappings: outcome.mappings });
}
