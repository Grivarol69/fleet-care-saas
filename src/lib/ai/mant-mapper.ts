import { anthropic } from './anthropic';
import type {
  MantMapperItem,
  MantMapperCandidate,
  MantMapperMapping,
  MantMapperOutcome,
} from './mant-mapper.types';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

function buildNullMappings(items: MantMapperItem[]): MantMapperMapping[] {
  return items.map(item => ({
    ocrDescription: item.description,
    mantItemId: null,
    confidence: 0,
  }));
}

export async function mapItemsToMantItems(
  items: MantMapperItem[],
  candidates: MantMapperCandidate[]
): Promise<MantMapperOutcome> {
  if (!process.env.ANTHROPIC_API_KEY_APP) {
    return {
      ok: false,
      reason: 'no_api_key',
      mappings: buildNullMappings(items),
    };
  }

  if (items.length === 0) {
    return { ok: true, mappings: [] };
  }

  if (candidates.length === 0) {
    return { ok: true, mappings: buildNullMappings(items) };
  }

  const itemList = items
    .map(
      (item, i) =>
        `${i}. ${item.description} | qty: ${item.quantity} | unitPrice: ${item.unitPrice}`
    )
    .join('\n');

  const catalogList = candidates
    .map(c => `${c.id}|${c.name}|${c.categoryName}`)
    .join('\n');

  const prompt = `Map each invoice item to the best matching MantItem from the catalog.

Items:
${itemList}

Catalog (ID|Name|Category):
${catalogList}

For each item, return the mantItemId of the best match and confidence 0-100. If no good match exists, return null for mantItemId with confidence 0.

Respond ONLY with valid JSON array (no markdown, no explanation):
[{"index":0,"mantItemId":"...","confidence":85}]`;

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return {
        ok: false,
        reason: 'malformed_response',
        mappings: buildNullMappings(items),
      };
    }

    const rawText = textBlock.text.trim();

    let parsed: Array<{
      index: number;
      mantItemId: string | null;
      confidence: number;
    }>;
    try {
      parsed = JSON.parse(rawText) as typeof parsed;
    } catch {
      // Try to extract JSON array from possible surrounding text
      const match = rawText.match(/\[[\s\S]*\]/);
      if (!match) {
        return {
          ok: false,
          reason: 'malformed_response',
          mappings: buildNullMappings(items),
        };
      }
      try {
        parsed = JSON.parse(match[0]) as typeof parsed;
      } catch {
        return {
          ok: false,
          reason: 'malformed_response',
          mappings: buildNullMappings(items),
        };
      }
    }

    if (!Array.isArray(parsed)) {
      return {
        ok: false,
        reason: 'malformed_response',
        mappings: buildNullMappings(items),
      };
    }

    // Build mappings indexed by item index
    const resultMap = new Map<
      number,
      { mantItemId: string | null; confidence: number }
    >();
    for (const entry of parsed) {
      if (typeof entry.index === 'number') {
        resultMap.set(entry.index, {
          mantItemId: entry.mantItemId ?? null,
          confidence:
            typeof entry.confidence === 'number' ? entry.confidence : 0,
        });
      }
    }

    const mappings: MantMapperMapping[] = items.map((item, i) => {
      const result = resultMap.get(i);
      return {
        ocrDescription: item.description,
        mantItemId: result?.mantItemId ?? null,
        confidence: result?.confidence ?? 0,
      };
    });

    return { ok: true, mappings };
  } catch {
    return {
      ok: false,
      reason: 'haiku_error',
      mappings: buildNullMappings(items),
    };
  }
}
