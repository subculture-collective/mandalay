import { useState, useEffect } from 'react';
import type { TimelineEvent, PlacemarkDetail } from '../types/api';
import { fetchTimelineEvents } from '../lib/api';
import { TimelineItem } from './TimelineItem';

export function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [placemarkDetail, setPlacemarkDetail] = useState<PlacemarkDetail | null>(null);

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

  const handleEventClick = async (event: TimelineEvent) => {
    setSelectedEvent(event);
    if (!event.placemark_id) return;

    try {
      setDetailLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/placemarks/${event.placemark_id}`);
      if (!response.ok) throw new Error('Failed to load placemark details');
      const detail = await response.json();
      setPlacemarkDetail(detail);
    } catch (err) {
      console.error('Failed to load placemark details:', err);
    } finally {
      setDetailLoading(false);
    }
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
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vegas Shooting Timeline</h1>
          <p className="mt-2 text-gray-600">{events.length} events</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline Events */}
          <div className="lg:col-span-2 space-y-4">
            {events.map((event) => (
              <TimelineItem
                key={event.placemark_id}
                event={event}
                onClick={() => handleEventClick(event)}
              />
            ))}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedEvent ? (
              <div className="sticky top-4 bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Event Details</h2>
                
                {detailLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
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
                          {placemarkDetail.location.coordinates[1].toFixed(6)}, {placemarkDetail.location.coordinates[0].toFixed(6)}
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
