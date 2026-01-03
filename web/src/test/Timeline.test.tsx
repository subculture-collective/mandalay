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
}));

// Import after mock to get the mocked version
import { fetchTimelineEvents, fetchPlacemark } from '../lib/api';

// Mock data
const mockTimelineEvents: TimelineEvent[] = [
  {
    timestamp: '2017-10-01T21:41:56Z',
    name: 'Event 1',
    description: 'First event description',
    location: { lat: 36.094506, lon: -115.172281 },
    media_links: ['https://youtube.com/watch?v=test1'],
    placemark_id: 1,
    folder_path: ['Folder 1'],
  },
  {
    timestamp: '2017-10-01T21:42:56Z',
    name: 'Event 2',
    description: 'Second event description',
    location: { lat: 36.095506, lon: -115.173281 },
    media_links: [],
    placemark_id: 2,
    folder_path: ['Folder 2'],
  },
];

const mockPlacemarkDetail1: PlacemarkDetail = {
  id: 1,
  name: 'Event 1',
  description: 'Detailed description for event 1',
  style_id: 'icon-1538-0288D1',
  folder_path: ['Folder 1'],
  timestamp: '2017-10-01T21:41:56Z',
  location: {
    type: 'Point',
    coordinates: [-115.172281, 36.094506],
  },
  media_links: ['https://youtube.com/watch?v=test1'],
};

describe('Timeline - Selection and Detail Fetch Integration', () => {
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
    useViewStore.setState({ selectedPlacemarkId: null });
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

  it('shows loading state while fetching timeline events', async () => {
    // Mock a delayed response
    vi.mocked(fetchTimelineEvents).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockTimelineEvents), 100))
    );

    render(<Timeline />, { wrapper });

    // Should show loading spinner
    expect(screen.getByText(/Loading timeline events/i)).toBeInTheDocument();

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getAllByText('Event 1')).toHaveLength(1);
    });
  });

  it('fetches and displays placemark detail when an event is selected', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail1);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getAllByText('Event 1')).toHaveLength(1);
    });

    // Initially, detail panel should show "Select an event"
    expect(screen.getByText(/Select an event to view details/i)).toBeInTheDocument();

    // Click on first event - get all matches and click the first (in timeline)
    const eventItems = screen.getAllByText('Event 1');
    fireEvent.click(eventItems[0]);

    // Should show loading skeleton (check for "Event Details" header)
    expect(screen.getByText('Event Details')).toBeInTheDocument();

    // Wait for detail to load
    await waitFor(() => {
      expect(screen.getByText('Detailed description for event 1')).toBeInTheDocument();
    });

    // Verify API was called with correct ID
    expect(fetchPlacemark).toHaveBeenCalledTimes(1);
    expect(fetchPlacemark).toHaveBeenCalledWith(1);
  });

  it('handles timeline events loading error', async () => {
    const errorMessage = 'Failed to load timeline events';
    vi.mocked(fetchTimelineEvents).mockRejectedValueOnce(new Error(errorMessage));

    render(<Timeline />, { wrapper });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/Error Loading Timeline/i)).toBeInTheDocument();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows error state with retry button when detail fetch fails', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    const errorMessage = 'Failed to fetch placemark';
    vi.mocked(fetchPlacemark).mockRejectedValueOnce(new Error(errorMessage));

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getAllByText('Event 1')).toHaveLength(1);
    });

    // Click on first event
    fireEvent.click(screen.getAllByText('Event 1')[0]);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load details')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays all expected detail fields when available', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail1);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getAllByText('Event 1')).toHaveLength(1);
    });

    // Click on first event
    fireEvent.click(screen.getAllByText('Event 1')[0]);

    // Wait for detail to load
    await waitFor(() => {
      expect(screen.getByText('Detailed description for event 1')).toBeInTheDocument();
    });

    // Check that all fields are displayed (use getAllByText for fields that might appear multiple times)
    expect(screen.getAllByText('Name')).toHaveLength(1);
    expect(screen.getAllByText('Time')).toHaveLength(1);
    expect(screen.getAllByText('Description')).toHaveLength(1);
    expect(screen.getAllByText('Category')).toHaveLength(1);
    expect(screen.getAllByText('Folder 1')).toHaveLength(2); // appears in timeline item and detail
    expect(screen.getAllByText('Location')).toHaveLength(1);
    expect(screen.getAllByText('Media')).toHaveLength(1);
  });
});
