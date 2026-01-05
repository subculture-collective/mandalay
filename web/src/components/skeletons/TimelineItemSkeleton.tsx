import { SkeletonBase } from './SkeletonBase';

/**
 * Skeleton placeholder for a timeline item
 * Mimics the structure of TimelineItem component
 */
export function TimelineItemSkeleton() {
  return (
    <div
      className="border-l-4 border-gray-300 bg-white p-4 shadow-sm"
      data-testid="timeline-item-skeleton"
      role="status"
      aria-label="Loading timeline item"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Time and category badges */}
          <div className="flex items-center gap-2">
            <SkeletonBase className="h-6 w-20" />
            <SkeletonBase className="h-4 w-16" />
          </div>
          {/* Title */}
          <SkeletonBase className="h-6 w-3/4" />
          {/* Description preview */}
          <div className="space-y-2">
            <SkeletonBase className="h-4 w-full" />
            <SkeletonBase className="h-4 w-5/6" />
          </div>
        </div>
        {/* Location icon placeholder */}
        <SkeletonBase className="h-5 w-5 flex-shrink-0" />
      </div>
    </div>
  );
}
