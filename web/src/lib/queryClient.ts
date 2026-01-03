import { QueryClient } from '@tanstack/react-query';

/**
 * Default query options for the application.
 * These can be overridden per-hook as needed.
 */
const defaultQueryOptions = {
  queries: {
    // Retry failed queries up to 3 times on network errors
    retry: (failureCount: number, error: Error) => {
      // Don't retry on 4xx errors (client errors)
      if (error.message.includes('404') || error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    // Data is considered stale after 5 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Keep unused data in cache for 10 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    // Refetch on window focus for fresh data
    refetchOnWindowFocus: true,
    // Refetch on reconnect after network loss
    refetchOnReconnect: true,
  },
};

/**
 * Create and configure the QueryClient for the application.
 * This client manages all data fetching, caching, and synchronization.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
}

/**
 * Singleton instance of QueryClient for the application.
 * Export this for use in tests or direct access if needed.
 */
export const queryClient = createQueryClient();
