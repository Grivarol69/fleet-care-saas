// Siigo error types — discriminated union pattern (no class hierarchy)

export type SiigoErrorKind =
  | { kind: 'auth'; statusCode: 401 | 403 }
  | { kind: 'rate_limit'; retryAfterMs: number }
  | { kind: 'validation'; fieldErrors: Record<string, string[]> }
  | { kind: 'api'; statusCode: number; responseBody?: unknown };

export type SiigoError = SiigoErrorKind & { message: string };

/**
 * Throws a native Error enriched with Siigo discriminant data.
 * Preserves stack trace while enabling kind-based narrowing.
 */
export function throwSiigoError(error: SiigoError): never {
  throw Object.assign(new Error(error.message), error);
}

/**
 * Type guard — use `err.kind` to narrow after catching.
 */
export function isSiigoError(err: unknown): err is Error & SiigoError {
  return err instanceof Error && 'kind' in err;
}
