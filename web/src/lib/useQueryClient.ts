import { useQueryClient as useTanStackQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Hook to access the QueryClient instance.
 * Useful in tests and components that need direct access to the query cache.
 * 
 * @returns The QueryClient instance
 * @throws Error if used outside of QueryClientProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const queryClient = useQueryClient();
 *   
 *   const handleInvalidate = () => {
 *     queryClient.invalidateQueries({ queryKey: ['timeline'] });
 *   };
 *   
 *   return <button onClick={handleInvalidate}>Refresh</button>;
 * }
 * ```
 */
export function useQueryClient(): QueryClient {
  return useTanStackQueryClient();
}
