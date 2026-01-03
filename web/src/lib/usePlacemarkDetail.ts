import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchPlacemark } from './api';
import type { PlacemarkDetail } from '../types/api';

/**
 * Query key factory for placemark detail.
 * Used for caching and invalidation.
 * 
 * @param id - The placemark ID
 * @returns Query key array for TanStack Query
 */
export const placemarkDetailQueryKey = (id: number) => ['placemark', id] as const;

/**
 * Hook to fetch placemark detail by ID using TanStack Query.
 * 
 * This hook fetches detailed information about a specific placemark.
 * It automatically disables the query when id is null or undefined,
 * preventing unnecessary API calls.
 * 
 * Each placemark is cached separately by its ID, allowing efficient
 * re-selection of previously viewed placemarks without refetching.
 * 
 * @param id - The placemark ID to fetch, or null/undefined to disable the query
 * @returns Query result with placemark detail data, loading state, error state, and refetch function
 * 
 * @example
 * ```tsx
 * function PlacemarkComponent({ placemarkId }: { placemarkId: number | null }) {
 *   const { data, isLoading, isError, error, refetch } = usePlacemarkDetail(placemarkId);
 *   
 *   if (!placemarkId) return <div>No placemark selected</div>;
 *   if (isLoading) return <div>Loading...</div>;
 *   if (isError) return <div>Error: {error.message}</div>;
 *   
 *   return (
 *     <div>
 *       <h1>{data.name}</h1>
 *       <p>{data.description}</p>
 *       <button onClick={() => refetch()}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlacemarkDetail(
  id: number | null | undefined
): UseQueryResult<PlacemarkDetail, Error> {
  return useQuery<PlacemarkDetail, Error>({
    queryKey: placemarkDetailQueryKey(id ?? 0),
    queryFn: () => {
      if (id == null) {
        throw new Error('Placemark ID is required');
      }
      return fetchPlacemark(id);
    },
    // Only fetch when id is provided
    enabled: id != null,
    // Placemark details are relatively static, use same staleTime as timeline events
    staleTime: 10 * 60 * 1000, // 10 minutes
    // Keep in cache for 15 minutes after last use
    gcTime: 15 * 60 * 1000,
  });
}
