import { useState, useEffect, useMemo } from 'react';
import type { TimelineEvent } from '../types/api';
import { fetchTimelineEvents } from '../lib/api';
import { TimelineItem } from './TimelineItem';
import { FolderFilter } from './FolderFilter';
import { SearchFilter } from './SearchFilter';
import { useViewStore } from '../lib/store';
import { usePlacemarkDetail } from '../lib/usePlacemarkDetail';

export function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use shared selection state from store
  const { selectedPlacemarkId, selectPlacemark, selectedFolder, searchText } = useViewStore();
  
  // Fetch detail using TanStack Query - automatically handles caching
  const { 
    data: placemarkDetail, 
    isLoading: detailLoading, 
    isError: detailError,
    error: detailErrorObj,
    refetch: refetchDetail 
  } = usePlacemarkDetail(selectedPlacemarkId);

  // Helper to safely format location coordinates
  const formatLocation = (coordinates: number[] | number[][] | number[][][]) => {
    if (typeof coordinates[1] === 'number' && typeof coordinates[0] === 'number') {
      return `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`;
    }
    return 'Location data available';
  };

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true);
        const data = await fetchTimelineEvents();
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timeline events');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

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
        const descriptionMatch = event.description?.toLowerCase().includes(searchLower);
        return nameMatch || descriptionMatch;
      });
    }

    return filtered;
  }, [events, selectedFolder, searchText]);

  const handleEventClick = (event: TimelineEvent) => {
    // Update shared selection state - this will trigger detail fetch via usePlacemarkDetail
    selectPlacemark(event.placemark_id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading timeline events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-red-900">Error Loading Timeline</h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline Events */}
          <div className="lg:col-span-2 space-y-4">
            {filteredEvents.map((event) => (
              <TimelineItem
                key={event.placemark_id}
                event={event}
                onClick={() => handleEventClick(event)}
                isSelected={event.placemark_id === selectedPlacemarkId}
              />
            ))}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedPlacemarkId ? (
              <div className="sticky top-4 bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Event Details</h2>
                
                {detailLoading ? (
                  <div className="space-y-4" role="status" aria-label="Loading event details">
                    {/* Loading skeleton */}
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-20 bg-gray-200 rounded mb-4"></div>
                    </div>
                  </div>
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
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Name</h3>
                      <p className="text-gray-900">{placemarkDetail.name}</p>
                    </div>

                    {placemarkDetail.timestamp && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-1">Time</h3>
                        <p className="text-gray-900 font-mono text-sm">
                          {new Date(placemarkDetail.timestamp).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {placemarkDetail.description && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-1">Description</h3>
                        <div className="text-sm text-gray-900 prose prose-sm max-w-none">
                          {placemarkDetail.description}
                        </div>
                      </div>
                    )}

                    {placemarkDetail.folder_path.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-1">Category</h3>
                        <p className="text-sm text-gray-600">
                          {placemarkDetail.folder_path.join(' > ')}
                        </p>
                      </div>
                    )}

                    {placemarkDetail.location && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-1">Location</h3>
                        <p className="text-sm text-gray-600 font-mono">
                          {formatLocation(placemarkDetail.location.coordinates)}
                        </p>
                      </div>
                    )}

                    {placemarkDetail.media_links && placemarkDetail.media_links.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-2">Media</h3>
                        <div className="space-y-2">
                          {placemarkDetail.media_links.map((link: string, idx: number) => (
                            <a
                              key={idx}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {link.includes('youtube') ? 'YouTube Video' : 'Media'} {idx + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
