# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\signup.spec.ts >> tRPC signup >> returns 400 when password exceeds 128 chars
- Location: tests\auth\signup.spec.ts:91:7

# Error details

```
Error: Expected success=false, got: {"error":{"message":"Validation failed","code":-32600,"data":{"code":"BAD_REQUEST","httpStatus":400,"stack":"TRPCError: [\n  {\n    \"code\": \"too_big\",\n    \"maximum\": 128,\n    \"type\": \"string\",\n    \"inclusive\": true,\n    \"exact\": false,\n    \"message\": \"Password must be at most 128 characters\",\n    \"path\": [\n      \"password\"\n    ]\n  }\n]\n    at inputValidatorMiddleware (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\initTRPC-_cqIfGlH.cjs:44:10)\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n    at async callRecursive (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\initTRPC-_cqIfGlH.cjs:256:18)\n    at async procedure (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\initTRPC-_cqIfGlH.cjs:281:18)\n    at async D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\resolveResponse-BCkjJQIz.cjs:1969:18\n    at async Object.resolveResponse (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\resolveResponse-BCkjJQIz.cjs:1998:28)\n    at async fastifyRequestHandler (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\adapters\\fastify\\index.cjs:25:14)\n    at async Object.<anonymous> (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\adapters\\fastify\\index.cjs:54:3)","path":"signup","errors":[{"path":"password","message":"Password must be at most 128 characters"}]}}}

expect(received).toBe(expected) // Object.is equality

Expected: false
Received: undefined
```

# Test source

```ts
  1  | import { expect } from '@playwright/test'
  2  | import type { APIResponse } from '@playwright/test'
  3  | import type { TRPCFlatResponse } from './trpc'
  4  | 
  5  | /** Assert a tRPC response is a success with the expected HTTP status. */
  6  | export function assertTRPCSuccess<T>(
  7  |   body: TRPCFlatResponse<T>,
  8  |   httpStatus = 200,
  9  | ): asserts body is TRPCFlatResponse<T> & { success: true; data: T } {
  10 |   expect(body.success, `Expected success=true, got: ${JSON.stringify(body)}`).toBe(true)
  11 |   expect(body.statusCode).toBe(httpStatus)
  12 | }
  13 | 
  14 | /** Assert a tRPC response is a failure with the expected status code. */
  15 | export function assertTRPCError(
  16 |   body: TRPCFlatResponse,
  17 |   expectedStatus: number,
  18 | ): void {
> 19 |   expect(body.success, `Expected success=false, got: ${JSON.stringify(body)}`).toBe(false)
     |                                                                                ^ Error: Expected success=false, got: {"error":{"message":"Validation failed","code":-32600,"data":{"code":"BAD_REQUEST","httpStatus":400,"stack":"TRPCError: [\n  {\n    \"code\": \"too_big\",\n    \"maximum\": 128,\n    \"type\": \"string\",\n    \"inclusive\": true,\n    \"exact\": false,\n    \"message\": \"Password must be at most 128 characters\",\n    \"path\": [\n      \"password\"\n    ]\n  }\n]\n    at inputValidatorMiddleware (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\initTRPC-_cqIfGlH.cjs:44:10)\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n    at async callRecursive (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\initTRPC-_cqIfGlH.cjs:256:18)\n    at async procedure (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\initTRPC-_cqIfGlH.cjs:281:18)\n    at async D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\resolveResponse-BCkjJQIz.cjs:1969:18\n    at async Object.resolveResponse (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\resolveResponse-BCkjJQIz.cjs:1998:28)\n    at async fastifyRequestHandler (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\adapters\\fastify\\index.cjs:25:14)\n    at async Object.<anonymous> (D:\\summer\\agentic-ai\\chefmate\\node_modules\\.pnpm\\@trpc+server@11.18.0_typescript@5.9.3\\node_modules\\@trpc\\server\\dist\\adapters\\fastify\\index.cjs:54:3)","path":"signup","errors":[{"path":"password","message":"Password must be at most 128 characters"}]}}}
  20 |   expect(body.statusCode).toBe(expectedStatus)
  21 | }
  22 | 
  23 | /** Assert a REST response has the given status and return its JSON body. */
  24 | export async function assertStatus<T = unknown>(
  25 |   response: APIResponse,
  26 |   expectedStatus: number,
  27 | ): Promise<T> {
  28 |   const body = await response.json() as T
  29 |   expect(
  30 |     response.status(),
  31 |     `Expected HTTP ${expectedStatus}, got ${response.status()}.\nBody: ${JSON.stringify(body)}`,
  32 |   ).toBe(expectedStatus)
  33 |   return body
  34 | }
  35 | 
  36 | /**
  37 |  * Assert a Set-Cookie header is present and return the cookie string.
  38 |  * Playwright's cookie jar handles these automatically, but this is
  39 |  * useful to verify cookies are actually being set.
  40 |  */
  41 | export function assertCookieSet(response: APIResponse, cookieName: string): string {
  42 |   const setCookieHeader = response.headers()['set-cookie'] ?? ''
  43 |   expect(
  44 |     setCookieHeader,
  45 |     `Expected Set-Cookie header containing "${cookieName}"`,
  46 |   ).toContain(cookieName)
  47 |   return setCookieHeader
  48 | }
  49 | 
```