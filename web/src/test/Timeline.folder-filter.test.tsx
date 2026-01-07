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

// Mock data
const mockTimelineEvents: TimelineEvent[] = [
  {
    timestamp: '2017-10-01T21:41:56Z',
    name: 'Event 1',
    description: 'First event description',
    location: { lat: 36.094506, lon: -115.172281 },
    media_links: ['https://youtube.com/watch?v=test1'],
    placemark_id: 1,
    folder_path: ['Videos taken on foot'],
  },
  {
    timestamp: '2017-10-01T21:42:56Z',
    name: 'Event 2',
    description: 'Second event description',
    location: { lat: 36.095506, lon: -115.173281 },
    media_links: [],
    placemark_id: 2,
    folder_path: ['Audio (911 calls)'],
  },
  {
    timestamp: '2017-10-01T21:43:56Z',
    name: 'Event 3',
    description: 'Third event description',
    location: { lat: 36.096506, lon: -115.174281 },
    media_links: [],
    placemark_id: 3,
    folder_path: ['Videos taken on foot'],
  },
  {
    timestamp: null,
    name: 'Event 4 - No timestamp',
    description: 'Fourth event without timestamp',
    location: { lat: 36.097506, lon: -115.175281 },
    media_links: [],
    placemark_id: 4,
    folder_path: ['Places of Interest'],
  },
];

const mockFolders = {
  folders: [
    'Videos taken on foot',
    'Audio (911 calls)',
    'Places of Interest',
  ],
  count: 3,
};

const mockPlacemarkDetail: PlacemarkDetail = {
  id: 1,
  name: 'Event 1',
  description: 'Detailed description',
  style_id: 'icon-1538-0288D1',
  folder_path: ['Videos taken on foot'],
  timestamp: '2017-10-01T21:41:56Z',
  location: {
    type: 'Point',
    coordinates: [-115.172281, 36.094506],
  },
  media_links: ['https://youtube.com/watch?v=test1'],
};

describe('Timeline - Folder Filter Integration', () => {
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
    useViewStore.setState({ selectedPlacemarkId: null, selectedFolder: null });
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

  it('displays all events when no folder filter is selected', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // All 4 events should be visible
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.getByText('Event 3')).toBeInTheDocument();
    expect(screen.getByText('Event 4 - No timestamp')).toBeInTheDocument();

    // Check event count
    expect(screen.getByText(/4 of 4 events/)).toBeInTheDocument();
  });

  it('filters events by selected folder', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events and folders to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.options.length).toBeGreaterThan(1);
    });

    // Select "Videos taken on foot" folder by updating store directly
    useViewStore.setState({ selectedFolder: 'Videos taken on foot' });

    // Wait for filter to apply
    await waitFor(() => {
      expect(screen.getByText(/2 of 4 events.*filtered/i)).toBeInTheDocument();
    });

    // Only events with matching folder should be visible
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.queryByText('Event 2')).not.toBeInTheDocument();
    expect(screen.getByText('Event 3')).toBeInTheDocument();
    expect(screen.queryByText('Event 4 - No timestamp')).not.toBeInTheDocument();
  });

  it('restores full list when filter is cleared', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Select a folder
    useViewStore.setState({ selectedFolder: 'Audio (911 calls)' });

    // Wait for filter to apply
    await waitFor(() => {
      expect(screen.getByText(/1 of 4 events.*filtered/i)).toBeInTheDocument();
    });

    // Only Event 2 should be visible
    expect(screen.queryByText('Event 1')).not.toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.queryByText('Event 3')).not.toBeInTheDocument();

    // Clear the filter
    const clearButton = screen.getByRole('button', { name: /clear folder filter/i });
    fireEvent.click(clearButton);

    // Wait for full list to restore
    await waitFor(() => {
      expect(screen.getByText(/4 of 4 events/)).toBeInTheDocument();
    });

    // All events should be visible again
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.getByText('Event 3')).toBeInTheDocument();
    expect(screen.getByText('Event 4 - No timestamp')).toBeInTheDocument();
  });

  it('filters events with null timestamps correctly', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Select "Places of Interest" folder (Event 4 has null timestamp)
    useViewStore.setState({ selectedFolder: 'Places of Interest' });

    // Wait for filter to apply
    await waitFor(() => {
      expect(screen.getByText(/1 of 4 events.*filtered/i)).toBeInTheDocument();
    });

    // Only Event 4 should be visible (the one with null timestamp)
    expect(screen.queryByText('Event 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Event 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Event 3')).not.toBeInTheDocument();
    expect(screen.getByText('Event 4 - No timestamp')).toBeInTheDocument();
  });

  it('allows selecting filtered events', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Select a folder filter
    useViewStore.setState({ selectedFolder: 'Videos taken on foot' });

    // Wait for filter to apply
    await waitFor(() => {
      expect(screen.getByText(/2 of 4 events.*filtered/i)).toBeInTheDocument();
    });

    // Click on a filtered event
    fireEvent.click(screen.getByText('Event 1'));

    // Wait for detail to load
    await waitFor(() => {
      expect(screen.getByText('Detailed description')).toBeInTheDocument();
    });

    // Verify API was called
    expect(fetchPlacemark).toHaveBeenCalledWith(1);
  });

  it('maintains filter across selection changes', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);
    vi.mocked(fetchPlacemark).mockResolvedValue(mockPlacemarkDetail);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Apply filter
    useViewStore.setState({ selectedFolder: 'Videos taken on foot' });

    await waitFor(() => {
      expect(screen.getByText(/2 of 4 events.*filtered/i)).toBeInTheDocument();
    });

    // Select an event
    fireEvent.click(screen.getByText('Event 1'));

    // Wait for any UI updates to complete by checking that filter is still active
    await waitFor(() => {
      expect(screen.getByText(/2 of 4 events.*filtered/i)).toBeInTheDocument();
    });

    // Filter should still be active
    expect(screen.queryByText('Event 2')).not.toBeInTheDocument();
  });

  it('shows no events when filter results in empty list', async () => {
    // Create events that don't include any with target folder
    const eventsWithoutFolder: TimelineEvent[] = [
      {
        timestamp: '2017-10-01T21:41:56Z',
        name: 'Event 1',
        description: 'First event',
        location: { lat: 36.094506, lon: -115.172281 },
        media_links: [],
        placemark_id: 1,
        folder_path: ['Other Folder'],
      },
    ];

    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(eventsWithoutFolder);
    vi.mocked(fetchFolders).mockResolvedValueOnce({
      folders: ['Other Folder', 'Nonexistent Folder'],
      count: 2,
    });

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Directly set the store state to simulate selecting a folder with no matching events
    useViewStore.setState({ selectedFolder: 'Nonexistent Folder' });

    // Wait for filter to apply
    await waitFor(() => {
      // When no events match, the count shows 0 of 1
      const text = screen.getByText(/0 of 1 events.*filtered/i);
      expect(text).toBeInTheDocument();
    });

    // No events should be visible
    expect(screen.queryByText('Event 1')).not.toBeInTheDocument();
  });

  it('non-destructively combines with future filters', async () => {
    // This test verifies that the folder filter can work alongside other filters
    // Since there are no other filters yet, we just verify the structure allows it
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Apply folder filter
    useViewStore.setState({ selectedFolder: 'Videos taken on foot' });

    await waitFor(() => {
      expect(screen.getByText(/2 of 4 events.*filtered/i)).toBeInTheDocument();
    });

    // Verify that the filtering is done with useMemo and doesn't mutate original events array
    // by clearing the filter and checking all events are back
    useViewStore.setState({ selectedFolder: null });

    await waitFor(() => {
      expect(screen.getByText(/4 of 4 events/)).toBeInTheDocument();
    });

    // All events should be back
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.getByText('Event 3')).toBeInTheDocument();
    expect(screen.getByText('Event 4 - No timestamp')).toBeInTheDocument();
  });
});
