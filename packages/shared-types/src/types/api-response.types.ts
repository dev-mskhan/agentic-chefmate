/**
 * Every REST response returned by every service (via the gateway or directly)
 * should conform to one of these two shapes. Keeping this identical across
 * services means the React client can have a single response-unwrapping
 * layer instead of one per service.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    [key: string]: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
