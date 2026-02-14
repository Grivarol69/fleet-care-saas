import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/maintenance/mant-items/similar?q=cambio aceite motor
 * Fuzzy search: busca items similares y devuelve score de similitud.
 * Se usa antes de crear un item nuevo para evitar duplicados.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    // Normalizar: quitar acentos, lowercase
    const normalized = normalize(q);
    const words = normalized.split(/\s+/).filter(w => w.length >= 2);

    if (words.length === 0) {
      return NextResponse.json([]);
    }

    // Buscar items globales + del tenant activos
    const allItems = await prisma.mantItem.findMany({
      where: {
        OR: [{ tenantId: user.tenantId }, { tenantId: null, isGlobal: true }],
        status: 'ACTIVE',
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Calcular similitud para cada item
    const scored = allItems
      .map(item => {
        const itemNormalized = normalize(item.name);
        const score = calculateSimilarity(normalized, words, itemNormalized);
        return { ...item, score };
      })
      .filter(item => item.score > 0.25) // Umbral mínimo 25%
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const results = scored.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      type: item.type,
      mantType: item.mantType,
      isGlobal: item.isGlobal,
      category: item.category,
      score: Math.round(item.score * 100), // Porcentaje 0-100
    }));

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error('[MANT_ITEMS_SIMILAR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

/** Quitar acentos y pasar a minúsculas */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Calcula similitud combinando:
 * 1. Coincidencia exacta de substring (peso alto)
 * 2. Coincidencia de palabras individuales
 * 3. Distancia de Levenshtein normalizada entre las dos cadenas
 */
function calculateSimilarity(
  queryNorm: string,
  queryWords: string[],
  itemNorm: string
): number {
  // 1. Contención exacta: si el query completo aparece en el nombre
  if (itemNorm.includes(queryNorm)) return 0.95;
  if (queryNorm.includes(itemNorm)) return 0.85;

  // 2. Coincidencia de palabras
  const itemWords = itemNorm.split(/\s+/).filter(w => w.length >= 2);
  let matchedWords = 0;
  for (const qw of queryWords) {
    if (itemWords.some(iw => iw.includes(qw) || qw.includes(iw))) {
      matchedWords++;
    }
  }
  const wordScore =
    queryWords.length > 0 ? matchedWords / queryWords.length : 0;

  // 3. Distancia de Levenshtein normalizada (para detectar typos)
  const levScore =
    1 -
    levenshteinDistance(queryNorm, itemNorm) /
      Math.max(queryNorm.length, itemNorm.length);

  // Combinar: 70% palabras, 30% levenshtein
  return wordScore * 0.7 + levScore * 0.3;
}

/** Distancia de Levenshtein */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0]![j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }
  return matrix[a.length]![b.length]!;
}
