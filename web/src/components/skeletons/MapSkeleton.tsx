import { SkeletonBase } from './SkeletonBase';

/**
 * Skeleton placeholder for the map area
 * Shows a simple loading state while map data is being fetched
 */
export function MapSkeleton() {
  return (
    <div
      className="absolute inset-0 bg-gray-100 flex items-center justify-center z-[1000]"
      data-testid="map-skeleton"
      role="status"
      aria-label="Loading map"
    >
      <div className="text-center space-y-4 p-6">
        <div className="flex justify-center">
          <SkeletonBase className="h-16 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <SkeletonBase className="h-4 w-32 mx-auto" />
          <SkeletonBase className="h-3 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}
