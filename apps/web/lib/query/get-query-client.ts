import {
  QueryClient,
  QueryCache,
  MutationCache,
  isServer,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";

function handleGlobalError(error: unknown) {
  if (typeof window === "undefined") return;
  if (!(error instanceof ApiError)) return;
  if (error.status === 503 || error.status === 429) {
    void import("@/lib/api/feedback").then(({ showApiError }) => showApiError(error));
  }
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleGlobalError }),
    mutationCache: new MutationCache({ onError: handleGlobalError }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
