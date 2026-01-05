import { SkeletonBase } from './SkeletonBase';

/**
 * Skeleton placeholder for the detail panel
 * Mimics the structure of PlacemarkDetail component
 */
export function DetailSkeleton() {
  return (
    <div
      className="space-y-4"
      data-testid="detail-skeleton"
      role="status"
      aria-label="Loading event details"
    >
      {/* Name field */}
      <div>
        <SkeletonBase className="h-4 w-1/4 mb-2" />
        <SkeletonBase className="h-6 w-3/4" />
      </div>
      
      {/* Time field */}
      <div>
        <SkeletonBase className="h-4 w-1/4 mb-2" />
        <SkeletonBase className="h-6 w-1/2" />
      </div>
      
      {/* Description field */}
      <div>
        <SkeletonBase className="h-4 w-1/4 mb-2" />
        <div className="space-y-2">
          <SkeletonBase className="h-4 w-full" />
          <SkeletonBase className="h-4 w-full" />
          <SkeletonBase className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}
