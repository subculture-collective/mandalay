import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { fetchPlacemarksBBox } from './api';
import type { BBox, BBoxResponse } from '../types/api';

/**
 * Query key factory for placemarks by bounding box.
 * Used for caching and invalidation.
 * 
 * @param bbox - The bounding box coordinates
 * @param limit - Optional limit parameter
 * @returns Query key array for TanStack Query
 */
export const placemarksBBoxQueryKey = (bbox: BBox, limit?: number) => {
  return ['placemarks', 'bbox', bbox.min_lon, bbox.min_lat, bbox.max_lon, bbox.max_lat, limit] as const;
};

export interface UsePlacemarksBBoxOptions {
  /**
   * Maximum number of results to return
   */
  limit?: number;
  /**
   * Debounce delay in milliseconds (default: 300)
   * Controls how long to wait after bbox changes before fetching
   */
  debounceMs?: number;
  /**
   * Whether the query is enabled
   */
  enabled?: boolean;
}

/**
 * Hook to fetch placemarks within a bounding box using TanStack Query with debouncing.
 * 
 * This hook fetches placemarks that fall within the specified geographic bounding box.
 * Requests are debounced to prevent rapid refetches when the bbox changes frequently
 * (e.g., during map panning or zooming).
 * 
 * Each unique bounding box is cached separately, allowing efficient switching between
 * different viewports without refetching.
 * 
 * @param bbox - The bounding box coordinates (min_lon, min_lat, max_lon, max_lat), or null/undefined to disable the query.
 *               Note: This should be a stable reference (e.g., from useState or useMemo) to ensure debouncing works correctly.
 *               Creating a new object on every render will prevent requests from completing.
 * @param options - Optional configuration including limit, debounceMs, and enabled
 * @returns Query result with bounding box response data, loading state, error state, and refetch function
 * 
 * @example
 * ```tsx
 * function MapComponent() {
 *   const [bbox, setBBox] = useState<BBox | null>(null);
 *   
 *   const { data, isLoading, isError, error, refetch } = usePlacemarksBBox(bbox, {
 *     limit: 100,
 *     debounceMs: 500, // Wait 500ms after bbox changes before fetching
 *   });
 *   
 *   if (!bbox) return <div>Set a bounding box</div>;
 *   if (isLoading) return <div>Loading...</div>;
 *   if (isError) return <div>Error: {error.message}</div>;
 *   
 *   return (
 *     <div>
 *       <p>Found {data.count} placemarks</p>
 *       {data.placemarks.map(p => <div key={p.id}>{p.name}</div>)}
 *       <button onClick={() => refetch()}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlacemarksBBox(
  bbox: BBox | null | undefined,
  options?: UsePlacemarksBBoxOptions
): UseQueryResult<BBoxResponse, Error> {
  const { limit, debounceMs = 300, enabled = true } = options || {};
  
  // State to hold the debounced bbox - start with undefined to ensure initial debounce
  const [debouncedBBox, setDebouncedBBox] = useState<BBox | null | undefined>(undefined);

  // Debounce the bbox changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedBBox(bbox);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox?.min_lon, bbox?.min_lat, bbox?.max_lon, bbox?.max_lat, debounceMs]);

  return useQuery<BBoxResponse, Error>({
    queryKey: debouncedBBox != null 
      ? placemarksBBoxQueryKey(debouncedBBox, limit)
      : ['placemarks', 'bbox', 'disabled', limit],
    queryFn: () => {
      if (debouncedBBox == null) {
        // This should never happen since the query is only enabled when debouncedBBox is not null
        throw new Error('BBox is required but was null or undefined - this indicates a query configuration error');
      }
      return fetchPlacemarksBBox({
        ...debouncedBBox,
        limit,
      });
    },
    // Only fetch when bbox is provided and enabled
    enabled: debouncedBBox != null && enabled,
    // Spatial queries can be cached for a moderate time
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Keep in cache for 10 minutes after last use
    gcTime: 10 * 60 * 1000,
  });
}
