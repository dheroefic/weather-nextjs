import { NextResponse } from 'next/server';

/**
 * API response helpers to consolidate duplicate error response patterns
 */

/**
 * Create a standardized error response
 * @param message - Error message to return
 * @param status - HTTP status code
 * @param details - Optional additional error details (only in development)
 * @returns NextResponse with error
 */
export function errorResponse(
  message: string, 
  status: number, 
  details?: string
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return NextResponse.json(
    { 
      error: message,
      ...(isDevelopment && details ? { details } : {})
    },
    { status }
  );
}

/**
 * Create a 400 Bad Request response
 */
export function badRequestResponse(message: string): NextResponse {
  return errorResponse(message, 400);
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return errorResponse(message, 401);
}

/**
 * Create a 403 Forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return errorResponse(message, 403);
}

/**
 * Create a 404 Not Found response
 */
export function notFoundResponse(message = 'Not Found'): NextResponse {
  return errorResponse(message, 404);
}

/**
 * Create a 500 Internal Server Error response
 */
export function internalErrorResponse(
  message = 'Internal Server Error',
  error?: unknown
): NextResponse {
  const details = error instanceof Error ? error.message : undefined;
  
  return errorResponse(message, 500, details);
}

/**
 * Create a 503 Service Unavailable response
 */
export function serviceUnavailableResponse(message = 'Service Unavailable'): NextResponse {
  return errorResponse(message, 503);
}

/**
 * Create a successful JSON response
 */
export function successResponse<T>(data: T, options?: ResponseInit): NextResponse {
  return NextResponse.json(data, options);
}
