import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Timeline } from '../components/Timeline';
import { useViewStore } from '../lib/store';
import type { TimelineEvent, PlacemarkDetail } from '../types/api';
import type { ReactNode } from 'react';

// Mock the api module
vi.mock('../lib/api', () => ({
  fetchTimelineEvents: vi.fn(),
  fetchPlacemark: vi.fn(),
  fetchFolders: vi.fn(),
}));

// Import after mock to get the mocked version
import { fetchTimelineEvents, fetchPlacemark, fetchFolders } from '../lib/api';

// Mock data with various timestamps
const mockTimelineEvents: TimelineEvent[] = [
  {
    timestamp: '2017-10-01T20:00:00Z',
    name: 'Early Event',
    description: 'Event before the main time window',
    location: { lat: 36.094506, lon: -115.172281 },
    media_links: [],
    placemark_id: 1,
    folder_path: ['Test'],
  },
  {
    timestamp: '2017-10-01T21:00:00Z',
    name: 'Start Boundary Event',
    description: 'Event exactly at start boundary',
    location: { lat: 36.095506, lon: -115.173281 },
    media_links: [],
    placemark_id: 2,
    folder_path: ['Test'],
  },
  {
    timestamp: '2017-10-01T21:30:00Z',
    name: 'Middle Event',
    description: 'Event in the middle of time range',
    location: { lat: 36.096506, lon: -115.174281 },
    media_links: [],
    placemark_id: 3,
    folder_path: ['Test'],
  },
  {
    timestamp: '2017-10-01T22:00:00Z',
    name: 'End Boundary Event',
    description: 'Event exactly at end boundary',
    location: { lat: 36.097506, lon: -115.175281 },
    media_links: [],
    placemark_id: 4,
    folder_path: ['Test'],
  },
  {
    timestamp: '2017-10-01T23:00:00Z',
    name: 'Late Event',
    description: 'Event after the main time window',
    location: { lat: 36.098506, lon: -115.176281 },
    media_links: [],
    placemark_id: 5,
    folder_path: ['Test'],
  },
  {
    timestamp: null,
    name: 'Event Without Timestamp',
    description: 'Event with null timestamp',
    location: { lat: 36.099506, lon: -115.177281 },
    media_links: [],
    placemark_id: 6,
    folder_path: ['Test'],
  },
];

const mockFolders = {
  folders: ['Test', 'Other'],
  count: 2,
};

const mockPlacemarkDetail: PlacemarkDetail = {
  id: 3,
  name: 'Middle Event',
  description: 'Detailed description',
  style_id: 'icon-1538-0288D1',
  folder_path: ['Test'],
  timestamp: '2017-10-01T21:30:00Z',
  location: {
    type: 'Point',
    coordinates: [-115.174281, 36.096506],
  },
  media_links: [],
};

describe('Timeline - Time Range Filter', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create a fresh QueryClient with no retries for faster tests
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Reset Zustand store state
    useViewStore.setState({ 
      selectedPlacemarkId: null, 
      selectedFolder: null,
      searchText: '',
      timeRangeStart: null,
      timeRangeEnd: null,
      includeNullTimestamps: true,
    });
  });

  afterEach(() => {
    // Clean up query client
    queryClient.clear();
  });

  // Helper to wrap component with providers
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('displays all events when no time range filter is set', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // All 6 events should be visible
    expect(screen.getByText('Early Event')).toBeInTheDocument();
    expect(screen.getByText('Start Boundary Event')).toBeInTheDocument();
    expect(screen.getByText('Middle Event')).toBeInTheDocument();
    expect(screen.getByText('End Boundary Event')).toBeInTheDocument();
    expect(screen.getByText('Late Event')).toBeInTheDocument();
    expect(screen.getByText('Event Without Timestamp')).toBeInTheDocument();
  });

  it('filters events within time range (inclusive boundaries)', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // Set time range to include events 2, 3, and 4
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
    });

    // Wait for filter to apply
    await waitFor(() => {
      expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    });

    // Only events within range should be visible, plus null timestamp event (by default)
    expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    expect(screen.getByText('Start Boundary Event')).toBeInTheDocument();
    expect(screen.getByText('Middle Event')).toBeInTheDocument();
    expect(screen.getByText('End Boundary Event')).toBeInTheDocument();
    expect(screen.queryByText('Late Event')).not.toBeInTheDocument();
    expect(screen.getByText('Event Without Timestamp')).toBeInTheDocument(); // included by default
  });

  it('filters with only start time set', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // Set only start time
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:30:00',
      timeRangeEnd: null,
    });

    await waitFor(() => {
      expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    });

    // Only events after start time should be visible
    expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Start Boundary Event')).not.toBeInTheDocument();
    expect(screen.getByText('Middle Event')).toBeInTheDocument();
    expect(screen.getByText('End Boundary Event')).toBeInTheDocument();
    expect(screen.getByText('Late Event')).toBeInTheDocument();
    expect(screen.getByText('Event Without Timestamp')).toBeInTheDocument();
  });

  it('filters with only end time set', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // Set only end time
    useViewStore.setState({ 
      timeRangeStart: null,
      timeRangeEnd: '2017-10-01T21:30:00',
    });

    await waitFor(() => {
      expect(screen.queryByText('Late Event')).not.toBeInTheDocument();
    });

    // Only events before end time should be visible
    expect(screen.getByText('Early Event')).toBeInTheDocument();
    expect(screen.getByText('Start Boundary Event')).toBeInTheDocument();
    expect(screen.getByText('Middle Event')).toBeInTheDocument();
    expect(screen.queryByText('End Boundary Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Late Event')).not.toBeInTheDocument();
    expect(screen.getByText('Event Without Timestamp')).toBeInTheDocument();
  });

  it('excludes null timestamp events when toggle is disabled', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // Set time range and disable null timestamps
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
      includeNullTimestamps: false,
    });

    await waitFor(() => {
      expect(screen.queryByText('Event Without Timestamp')).not.toBeInTheDocument();
    });

    // Null timestamp event should not be visible
    expect(screen.getByText('Start Boundary Event')).toBeInTheDocument();
    expect(screen.getByText('Middle Event')).toBeInTheDocument();
    expect(screen.getByText('End Boundary Event')).toBeInTheDocument();
    expect(screen.queryByText('Event Without Timestamp')).not.toBeInTheDocument();
  });

  it('includes null timestamp events when toggle is enabled', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // Set time range with null timestamps included (default)
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
      includeNullTimestamps: true,
    });

    await waitFor(() => {
      expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    });

    // Null timestamp event should be visible
    expect(screen.getByText('Event Without Timestamp')).toBeInTheDocument();
  });

  it('restores full list when time range filter is cleared', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // Apply time range filter
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
    });

    await waitFor(() => {
      expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    });

    // Clear the filter by clicking clear button
    const clearButton = screen.getByRole('button', { name: /clear time range filter/i });
    fireEvent.click(clearButton);

    // All events should be visible again
    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    expect(screen.getByText('Early Event')).toBeInTheDocument();
    expect(screen.getByText('Start Boundary Event')).toBeInTheDocument();
    expect(screen.getByText('Middle Event')).toBeInTheDocument();
    expect(screen.getByText('End Boundary Event')).toBeInTheDocument();
    expect(screen.getByText('Late Event')).toBeInTheDocument();
    expect(screen.getByText('Event Without Timestamp')).toBeInTheDocument();
  });

  it('combines time range filter with folder filter', async () => {
    const eventsWithMultipleFolders: TimelineEvent[] = [
      ...mockTimelineEvents,
      {
        timestamp: '2017-10-01T21:30:00Z',
        name: 'Other Folder Event',
        description: 'Event in different folder',
        location: { lat: 36.100506, lon: -115.178281 },
        media_links: [],
        placemark_id: 7,
        folder_path: ['Other'],
      },
    ];

    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(eventsWithMultipleFolders);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // Apply both filters
    useViewStore.setState({ 
      selectedFolder: 'Test',
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
    });

    await waitFor(() => {
      expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    });

    // Only events matching both filters should be visible
    expect(screen.getByText('Start Boundary Event')).toBeInTheDocument();
    expect(screen.getByText('Middle Event')).toBeInTheDocument();
    expect(screen.getByText('End Boundary Event')).toBeInTheDocument();
    expect(screen.queryByText('Other Folder Event')).not.toBeInTheDocument(); // wrong folder
    expect(screen.queryByText('Late Event')).not.toBeInTheDocument(); // out of time range
  });

  it('combines time range filter with search filter', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // Apply time range filter
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
    });

    await waitFor(() => {
      expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    });

    // Apply search filter
    const searchInput = screen.getByPlaceholderText(/search by name or description/i);
    fireEvent.change(searchInput, { target: { value: 'boundary' } });

    // Wait for debounce and both filters to apply
    await waitFor(() => {
      expect(screen.queryByText('Middle Event')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Only events matching both filters should be visible
    expect(screen.getByText('Start Boundary Event')).toBeInTheDocument();
    expect(screen.getByText('End Boundary Event')).toBeInTheDocument();
    expect(screen.queryByText('Middle Event')).not.toBeInTheDocument(); // doesn't match search
  });

  it('handles edge case with start time after end time', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // Set invalid range (start after end)
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T22:00:00',
      timeRangeEnd: '2017-10-01T21:00:00',
    });

    await waitFor(() => {
      // No events should match this invalid range
      expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    });

    // Only null timestamp event should be visible (if includeNullTimestamps is true)
    expect(screen.queryByText('Start Boundary Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Middle Event')).not.toBeInTheDocument();
    expect(screen.queryByText('End Boundary Event')).not.toBeInTheDocument();
    expect(screen.getByText('Event Without Timestamp')).toBeInTheDocument();
  });

  it('allows selecting filtered events', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // Apply time range filter
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
    });

    await waitFor(() => {
      expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    });

    // Click on filtered event
    fireEvent.click(screen.getByText('Middle Event'));

    // Wait for detail to load
    await waitFor(() => {
      expect(screen.getByText('Detailed description')).toBeInTheDocument();
    });

    // Verify API was called
    expect(fetchPlacemark).toHaveBeenCalledWith(3);
  });

  it('maintains time range filter across selection changes', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);
    vi.mocked(fetchPlacemark).mockResolvedValue(mockPlacemarkDetail);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Early Event')).toBeInTheDocument();
    });

    // Apply time range filter
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
    });

    await waitFor(() => {
      expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    });

    // Select an event
    fireEvent.click(screen.getByText('Middle Event'));

    // Wait for any UI updates
    await waitFor(() => {
      expect(screen.getByText('Detailed description')).toBeInTheDocument();
    });

    // Filter should still be active
    expect(screen.queryByText('Early Event')).not.toBeInTheDocument();
    expect(screen.getAllByText('Middle Event').length).toBeGreaterThan(0);
  });

  it('handles all events having null timestamps', async () => {
    const allNullEvents: TimelineEvent[] = [
      {
        timestamp: null,
        name: 'Null Event 1',
        description: 'First event without timestamp',
        location: { lat: 36.094506, lon: -115.172281 },
        media_links: [],
        placemark_id: 1,
        folder_path: ['Test'],
      },
      {
        timestamp: null,
        name: 'Null Event 2',
        description: 'Second event without timestamp',
        location: { lat: 36.095506, lon: -115.173281 },
        media_links: [],
        placemark_id: 2,
        folder_path: ['Test'],
      },
    ];

    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(allNullEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Null Event 1')).toBeInTheDocument();
    });

    // Apply time range filter with null timestamps included
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
      includeNullTimestamps: true,
    });

    await waitFor(() => {
      expect(screen.getByText('Null Event 1')).toBeInTheDocument();
    });

    // Both null events should be visible when includeNullTimestamps is true
    expect(screen.getByText('Null Event 1')).toBeInTheDocument();
    expect(screen.getByText('Null Event 2')).toBeInTheDocument();

    // Disable null timestamps
    useViewStore.setState({ includeNullTimestamps: false });

    await waitFor(() => {
      expect(screen.queryByText('Null Event 1')).not.toBeInTheDocument();
    });

    // No events should be visible when includeNullTimestamps is false
    expect(screen.queryByText('Null Event 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Null Event 2')).not.toBeInTheDocument();
  });
});
