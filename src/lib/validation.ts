import { z } from 'zod';

/**
 * Safely parse a string to integer
 * Returns null if parsing fails or value is not a valid positive integer
 */
export function safeParseInt(value: string | undefined | null): number | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

/**
 * Parse and validate a positive integer ID from string
 * Throws an error with a message if invalid
 */
export function parseIdParam(
  value: string | undefined | null,
  paramName: string = 'id'
): number {
  const parsed = safeParseInt(value);
  if (parsed === null) {
    throw new Error(`${paramName} inválido`);
  }
  return parsed;
}

/**
 * Zod schema for positive integer
 */
export const positiveIntSchema = z.coerce.number().int().positive();

/**
 * Zod schema for optional positive integer
 */
export const optionalPositiveIntSchema = z.coerce
  .number()
  .int()
  .positive()
  .optional();

/**
 * Zod schema for pagination
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().positive().optional(),
});

/**
 * Validate an ID parameter and return appropriate error response if invalid
 */
export function validateIdParam(
  value: string | undefined | null,
  paramName: string = 'id'
): { valid: true; id: number } | { valid: false; error: string } {
  const parsed = safeParseInt(value);
  if (parsed === null) {
    return { valid: false, error: `${paramName} inválido` };
  }
  return { valid: true, id: parsed };
}
