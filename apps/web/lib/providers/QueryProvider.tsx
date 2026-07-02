"use client";
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { ApiError } from "../api/client";
import { showApiError } from "../api/feedback";

function handleGlobalError(error: unknown) {
  if (!(error instanceof ApiError)) return;

  // 503 / 429 — message fourni par l'API uniquement
  if (error.status === 503 || error.status === 429) {
    showApiError(error);
  }

  // 401/403 sont gérés dans client.ts (refresh + redirect)
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: handleGlobalError,
        }),
        mutationCache: new MutationCache({
          onError: handleGlobalError,
        }),
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,
            retry: (failureCount, error) => {
              // Ne pas réessayer sur les erreurs client (4xx)
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
