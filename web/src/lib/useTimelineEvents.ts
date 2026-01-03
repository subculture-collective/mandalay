import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchTimelineEvents } from './api';
import type { TimelineEvent } from '../types/api';

/**
 * Query key for timeline events.
 * Used for caching and invalidation.
 */
export const timelineEventsQueryKey = ['timeline', 'events'] as const;

/**
 * Hook to fetch timeline events using TanStack Query.
 * 
 * Timeline events are mostly static data, so this hook uses a longer staleTime
 * (10 minutes) compared to the default (5 minutes) to reduce unnecessary refetches.
 * 
 * @returns Query result with timeline events data, loading state, error state, and refetch function
 * 
 * @example
 * ```tsx
 * function TimelineComponent() {
 *   const { data, isLoading, isError, error, refetch } = useTimelineEvents();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (isError) return <div>Error: {error.message}</div>;
 *   
 *   return (
 *     <div>
 *       {data.map(event => <div key={event.placemark_id}>{event.name}</div>)}
 *       <button onClick={() => refetch()}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTimelineEvents(): UseQueryResult<TimelineEvent[], Error> {
  return useQuery<TimelineEvent[], Error>({
    queryKey: timelineEventsQueryKey,
    queryFn: fetchTimelineEvents,
    // Timeline events are mostly static, so use a longer staleTime
    staleTime: 10 * 60 * 1000, // 10 minutes
    // Keep in cache for 15 minutes after last use
    gcTime: 15 * 60 * 1000,
  });
}
