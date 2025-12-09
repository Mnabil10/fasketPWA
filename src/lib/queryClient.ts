import { QueryClient } from "@tanstack/react-query";

const shouldRetry = (failureCount: number, error: any) => {
  const status = (error?.response?.status ?? error?.status) as number | undefined;
  if (status && status < 500 && status !== 408) return false;
  return failureCount < 2;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

