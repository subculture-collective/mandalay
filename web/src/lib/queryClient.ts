import { QueryClient } from '@tanstack/react-query';

/**
 * Default query options for the application.
 * These can be overridden per-hook as needed.
 */
const defaultQueryOptions = {
  queries: {
    // Retry failed queries up to 3 times on network errors
    retry: (failureCount: number, error: Error) => {
      // Check for HTTP status code in error object (if available)
      const errorWithStatus = error as Error & { status?: number; response?: { status?: number } };
      const status = errorWithStatus.status || errorWithStatus.response?.status;
      
      // Don't retry on 4xx errors (client errors)
      if (status && status >= 400 && status < 500) {
        return false;
      }
      
      // Also check error message for status codes (fallback for different error formats)
      // Use regex to match exact status codes as words to avoid false positives (e.g., "Room 404B")
      const clientErrorCodePattern = /\b(401|403|404)\b/;
      if (clientErrorCodePattern.test(error.message)) {
        return false;
      }
      
      // Retry up to 3 times for network errors and 5xx errors
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
 * Export this for use in the main app or direct access if needed.
 * 
 * ⚠️ WARNING: Do not use this singleton in tests! It can cause test pollution
 * if tests run in parallel or if the cache is not properly cleared between tests.
 * In tests, always use `createQueryClient()` to get a fresh instance.
 */
export const queryClient = createQueryClient();
