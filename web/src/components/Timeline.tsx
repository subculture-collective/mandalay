import { useMemo, useRef, useCallback, useEffect } from 'react';
import { VariableSizeList } from 'react-window';
import type { TimelineEvent } from '../types/api';
import { useTimelineEvents } from '../lib/useTimelineEvents';
import { TimelineItem } from './TimelineItem';
import { FolderFilter } from './FolderFilter';
import { SearchFilter } from './SearchFilter';
import { TimeRangeFilter } from './TimeRangeFilter';
import { FilterResetButton } from './FilterResetButton';
import { useViewStore } from '../lib/store';
import { usePlacemarkDetail } from '../lib/usePlacemarkDetail';
import { PlacemarkDetail } from './PlacemarkDetail';
import { TimelineItemSkeleton, DetailSkeleton } from './skeletons';

// Estimated item height for virtualization
const ESTIMATED_ITEM_HEIGHT = 120;
const ITEM_GAP = 16; // 1rem gap between items
const DEFAULT_LIST_HEIGHT = 600; // Default height for tests and SSR

// Helper to safely get window height
const getListHeight = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_LIST_HEIGHT;
  }
  return Math.max(window.innerHeight - 300, DEFAULT_LIST_HEIGHT);
};

export function Timeline() {
  const listRef = useRef<VariableSizeList>(null);
  // Use placemark_id as key for stable height caching across filter changes
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  
  // Use shared selection state from store
  const { selectedPlacemarkId, selectPlacemark, selectedFolder, searchText, timeRangeStart, timeRangeEnd, includeNullTimestamps } = useViewStore();
  
  // Fetch timeline events using TanStack Query
  const {
    data: events = [],
    isLoading: loading,
    isError: hasError,
    error: errorObj,
    refetch: refetchEvents
  } = useTimelineEvents();
  
  // Fetch detail using TanStack Query - automatically handles caching
  const { 
    data: placemarkDetail, 
    isLoading: detailLoading, 
    isError: detailError,
    error: detailErrorObj,
    refetch: refetchDetail 
  } = usePlacemarkDetail(selectedPlacemarkId);

  // Filter events by selected folder and search text
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Apply folder filter
    if (selectedFolder) {
      filtered = filtered.filter((event) =>
        event.folder_path.some((folder) => folder === selectedFolder)
      );
    }

    // Apply search text filter (case-insensitive)
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((event) => {
        const nameMatch = event.name.toLowerCase().includes(searchLower);
        const descriptionMatch = event.description?.toLowerCase().includes(searchLower) ?? false;
        return nameMatch || descriptionMatch;
      });
    }

    // Apply time range filter
    if (timeRangeStart !== null || timeRangeEnd !== null) {
      // Parse and validate dates once for performance
      const parsedStartTime = timeRangeStart ? Date.parse(timeRangeStart) : NaN;
      const parsedEndTime = timeRangeEnd ? Date.parse(timeRangeEnd) : NaN;
      const hasValidStart = !Number.isNaN(parsedStartTime);
      const hasValidEnd = !Number.isNaN(parsedEndTime);

      if (hasValidStart || hasValidEnd) {
        const startTime = hasValidStart ? parsedStartTime : -Infinity;
        const endTime = hasValidEnd ? parsedEndTime : Infinity;

        filtered = filtered.filter((event) => {
          // Handle null timestamps based on user preference
          if (event.timestamp === null) {
            return includeNullTimestamps;
          }

          const eventTime = Date.parse(event.timestamp);
          if (Number.isNaN(eventTime)) {
            // Treat invalid event timestamps similarly to null timestamps
            return includeNullTimestamps;
          }

          return eventTime >= startTime && eventTime <= endTime;
        });
      }
    }

    return filtered;
  }, [events, selectedFolder, searchText, timeRangeStart, timeRangeEnd, includeNullTimestamps]);

  const handleEventClick = (event: TimelineEvent) => {
    // Update shared selection state - this will trigger detail fetch via usePlacemarkDetail
    selectPlacemark(event.placemark_id);
  };

  // Scroll to selected item when selection changes
  useEffect(() => {
    if (selectedPlacemarkId !== null && listRef.current) {
      const selectedIndex = filteredEvents.findIndex(
        (event) => event.placemark_id === selectedPlacemarkId
      );
      if (selectedIndex !== -1) {
        listRef.current.scrollToItem(selectedIndex, 'smart');
      }
    }
  }, [selectedPlacemarkId, filteredEvents]);

  // Get item size with caching for better performance
  // Cache by placemark_id for stability across filter changes
  const getItemSize = useCallback(
    (index: number) => {
      const event = filteredEvents[index];
      if (!event) {
        return ESTIMATED_ITEM_HEIGHT;
      }

      const cachedHeight = itemHeightsRef.current.get(event.placemark_id);
      return cachedHeight ?? ESTIMATED_ITEM_HEIGHT;
    },
    [filteredEvents]
  );

  // Set item height after rendering
  const setItemHeight = useCallback(
    (index: number, size: number) => {
      const event = filteredEvents[index];
      if (!event) {
        return;
      }

      const key = event.placemark_id;
      if (itemHeightsRef.current.get(key) !== size) {
        itemHeightsRef.current.set(key, size);
        listRef.current?.resetAfterIndex(index);
      }
    },
    [filteredEvents]
  );

  // Recalculate list layout when filtered events change, but keep height cache
  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [filteredEvents.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Vegas Shooting Timeline</h1>
            <p className="mt-2 text-gray-600">Loading events...</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline skeleton */}
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <TimelineItemSkeleton key={index} />
              ))}
            </div>

            {/* Detail panel placeholder */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 bg-white rounded-lg shadow-lg p-6 text-center text-gray-500">
                Select an event to view details
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div role="alert" className="text-center max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-red-900">Error Loading Timeline</h3>
          <p className="mt-1 text-sm text-red-700">{errorObj?.message || 'Failed to load timeline events'}</p>
          <button
            onClick={() => refetchEvents()}
            aria-label="Retry loading timeline events"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Vegas Shooting Timeline</h1>
          <p className="mt-2 text-gray-600">
            {`${filteredEvents.length} of ${events.length} events${selectedFolder && filteredEvents.length !== events.length ? ' (filtered)' : ''}`}
          </p>
        </header>

        {/* Search and Folder Filters */}
        <div className="mb-6 space-y-4">
          <SearchFilter />
          <FolderFilter />
          <TimeRangeFilter />
          <FilterResetButton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline Events */}
          <div className="lg:col-span-2">
            {filteredEvents.length > 0 ? (
              <VariableSizeList
                ref={listRef}
                height={getListHeight()}
                itemCount={filteredEvents.length}
                itemSize={getItemSize}
                itemKey={(index: number) => filteredEvents[index]?.placemark_id ?? index}
                width="100%"
                overscanCount={3}
              >
                {({ index, style }: { index: number; style: React.CSSProperties }) => {
                  const event = filteredEvents[index];
                  // Handle both number and string types for style properties
                  const heightValue =
                    typeof style.height === 'number'
                      ? style.height
                      : parseFloat((style.height ?? '0') as string);
                  
                  return (
                    <div 
                      role="listitem"
                      aria-setsize={filteredEvents.length}
                      aria-posinset={index + 1}
                      style={{
                        ...style,
                        height: heightValue - ITEM_GAP,
                      }}
                    >
                      <TimelineItem
                        event={event}
                        onClick={() => handleEventClick(event)}
                        isSelected={event.placemark_id === selectedPlacemarkId}
                        onHeightChange={(height) => setItemHeight(index, height + ITEM_GAP)}
                      />
                    </div>
                  );
                }}
              </VariableSizeList>
            ) : (
              <div className="text-center py-12 text-gray-500" role="status" aria-live="polite">
                No events match the current filters
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedPlacemarkId ? (
              <div className="sticky top-4 bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Event Details</h2>
                
                {detailLoading ? (
                  <DetailSkeleton />
                ) : detailError ? (
                  <div className="py-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-medium text-red-800">Failed to load details</h3>
                          <p className="mt-1 text-sm text-red-700">
                            {detailErrorObj?.message || 'An error occurred while loading placemark details'}
                          </p>
                          <button
                            onClick={() => refetchDetail()}
                            className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : placemarkDetail ? (
                  <PlacemarkDetail detail={placemarkDetail} />
                ) : (
                  <p className="text-gray-500">No additional details available</p>
                )}
              </div>
            ) : (
              <div className="sticky top-4 bg-white rounded-lg shadow-lg p-6 text-center text-gray-500">
                Select an event to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
