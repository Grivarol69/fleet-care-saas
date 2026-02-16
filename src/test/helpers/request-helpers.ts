import { NextRequest } from 'next/server';

/**
 * Create a NextRequest for API route testing.
 */
export function createApiRequest(
  method: string,
  url: string,
  body?: object
): NextRequest {
  if (body) {
    return new NextRequest(url, {
      method,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new NextRequest(url, { method });
}

/**
 * Create a NextRequest with URL search params (for GET requests with filters).
 */
export function createApiRequestWithParams(
  method: string,
  baseUrl: string,
  params: Record<string, string>
): NextRequest {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return new NextRequest(url.toString(), { method });
}

/**
 * Base URL for test API requests.
 */
export const TEST_BASE_URL = 'http://localhost:3000';

/**
 * Shorthand to create a POST request with JSON body.
 */
export function postRequest(path: string, body: object): NextRequest {
  return createApiRequest('POST', `${TEST_BASE_URL}${path}`, body);
}

/**
 * Shorthand to create a GET request with optional params.
 */
export function getRequest(
  path: string,
  params?: Record<string, string>
): NextRequest {
  if (params) {
    return createApiRequestWithParams('GET', `${TEST_BASE_URL}${path}`, params);
  }
  return createApiRequest('GET', `${TEST_BASE_URL}${path}`);
}

/**
 * Shorthand to create a PATCH request with JSON body.
 */
export function patchRequest(path: string, body: object): NextRequest {
  return createApiRequest('PATCH', `${TEST_BASE_URL}${path}`, body);
}

/**
 * Shorthand to create a DELETE request.
 */
export function deleteRequest(path: string): NextRequest {
  return createApiRequest('DELETE', `${TEST_BASE_URL}${path}`);
}
