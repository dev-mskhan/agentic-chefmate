import { createTRPCClient, httpBatchLink, type TRPCClient } from "@trpc/client";
import type { AppRouter } from "@platform/auth-service";

export function createAuthTrpcClient(authServiceUrl: string): TRPCClient<AppRouter> {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${authServiceUrl}/api/v1/trpc`,
      }),
    ],
  });
}
