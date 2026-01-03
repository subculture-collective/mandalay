import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchFolders } from './api';
import type { FoldersResponse } from '../types/api';

/**
 * Query key for folders.
 * Used for caching and invalidation.
 */
export const foldersQueryKey = ['folders'] as const;

/**
 * Hook to fetch folders using TanStack Query.
 * 
 * Folders are static data that rarely changes, so this hook uses a longer staleTime
 * (15 minutes) to reduce unnecessary refetches.
 * 
 * @returns Query result with folders data, loading state, error state, and refetch function
 * 
 * @example
 * ```tsx
 * function FolderFilterComponent() {
 *   const { data, isLoading, isError, error } = useFolders();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (isError) return <div>Error: {error.message}</div>;
 *   
 *   return (
 *     <select>
 *       {data.folders.map(folder => <option key={folder}>{folder}</option>)}
 *     </select>
 *   );
 * }
 * ```
 */
export function useFolders(): UseQueryResult<FoldersResponse, Error> {
  return useQuery<FoldersResponse, Error>({
    queryKey: foldersQueryKey,
    queryFn: fetchFolders,
    // Folders are static data, so use a longer staleTime
    staleTime: 15 * 60 * 1000, // 15 minutes
    // Keep in cache for 20 minutes after last use
    gcTime: 20 * 60 * 1000,
  });
}
