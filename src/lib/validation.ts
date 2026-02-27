import { z } from 'zod';

/**
 * Safely parse a string ID
 * Returns the id if it's a non-empty string, null otherwise
 */
export function safeParseId(id: string | undefined | null): string | null {
  if (!id || typeof id !== 'string') {
    return null;
  }
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

/**
 * Parse and validate a string ID from a route param
 * Throws an error with a message if invalid
 */
export function parseIdParam(
  value: string | undefined | null,
  paramName: string = 'id'
): string {
  const parsed = safeParseId(value);
  if (parsed === null) {
    throw new Error(`${paramName} inválido`);
  }
  return parsed;
}

/**
 * Zod schema for string ID
 */
export const idSchema = z.string().min(1);

/**
 * Zod schema for optional positive integer (for pagination and non-ID numeric fields)
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
): { valid: true; id: string } | { valid: false; error: string } {
  const parsed = safeParseId(value);
  if (parsed === null) {
    return { valid: false, error: `${paramName} inválido` };
  }
  return { valid: true, id: parsed };
}
