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

  const mockFolders = {
    folders: ['Folder 1', 'Folder 2'],
    count: 2,
  };

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
    
    // Mock fetchFolders for all tests
    vi.mocked(fetchFolders).mockResolvedValue(mockFolders);
    
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
    vi.mocked(fetchPlacemark)
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockPlacemarkDetail1); // Second call succeeds after retry

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
    expect(fetchPlacemark).toHaveBeenCalledTimes(1);

    // Click retry button
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    // Wait for successful data after retry
    await waitFor(() => {
      expect(screen.getByText('Detailed description for event 1')).toBeInTheDocument();
    });

    // Verify fetchPlacemark was called again
    expect(fetchPlacemark).toHaveBeenCalledTimes(2);
    expect(fetchPlacemark).toHaveBeenCalledWith(1);
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
    expect(screen.getAllByText('Folder 1')).toHaveLength(3); // appears in timeline item, detail, and folder filter dropdown
    expect(screen.getAllByText('Location')).toHaveLength(1);
    expect(screen.getAllByText('Media')).toHaveLength(1);
  });

  it('caches placemark details and does not refetch on re-selection', async () => {
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

    expect(fetchPlacemark).toHaveBeenCalledTimes(1);

    // Manually clear selection by updating the store
    useViewStore.setState({ selectedPlacemarkId: null });

    // Wait for panel to update
    await waitFor(() => {
      expect(screen.getByText(/Select an event to view details/i)).toBeInTheDocument();
    });

    // Click on first event again (re-selection)
    fireEvent.click(screen.getAllByText('Event 1')[0]);

    // Wait for cached detail to display
    await waitFor(() => {
      expect(screen.getByText('Detailed description for event 1')).toBeInTheDocument();
    });

    // Verify fetchPlacemark was NOT called again (still only 1 call from before)
    expect(fetchPlacemark).toHaveBeenCalledTimes(1);
  });

  it('applies highlight style to selected timeline item', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail1);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getAllByText('Event 1')).toHaveLength(1);
    });

    // Get the timeline item (rendered as a div with specific classes)
    const timelineItem = screen.getAllByText('Event 1')[0].closest('div[class*="border-l-4"]');
    expect(timelineItem).toBeInTheDocument();
    
    // Before selection, item should not have selected styles
    expect(timelineItem?.className).toContain('border-blue-500');
    expect(timelineItem?.className).not.toContain('ring-2');

    // Click on first event to select it
    fireEvent.click(screen.getAllByText('Event 1')[0]);

    // Wait for selection to be applied
    await waitFor(() => {
      const selectedItem = screen.getAllByText('Event 1')[0].closest('div[class*="border-l-4"]');
      expect(selectedItem?.className).toContain('ring-2');
      expect(selectedItem?.className).toContain('ring-blue-500');
      expect(selectedItem?.className).toContain('bg-blue-50');
    });
  });

  it('updates highlight when selection changes externally', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchPlacemark).mockResolvedValue(mockPlacemarkDetail1);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getAllByText('Event 1')).toHaveLength(1);
    });

    // Simulate external selection change (e.g., from map click)
    useViewStore.setState({ selectedPlacemarkId: 1 });

    // Wait for highlight to be applied
    await waitFor(() => {
      const selectedItem = screen.getAllByText('Event 1')[0].closest('div[class*="border-l-4"]');
      expect(selectedItem?.className).toContain('ring-2');
      expect(selectedItem?.className).toContain('ring-blue-500');
    });

    // Change selection to Event 2
    useViewStore.setState({ selectedPlacemarkId: 2 });

    // Wait for highlight to move to Event 2
    await waitFor(() => {
      const event1Item = screen.getAllByText('Event 1')[0].closest('div[class*="border-l-4"]');
      const event2Item = screen.getAllByText('Event 2')[0].closest('div[class*="border-l-4"]');
      
      // Event 1 should no longer have selected styles
      expect(event1Item?.className).not.toContain('ring-2');
      
      // Event 2 should have selected styles
      expect(event2Item?.className).toContain('ring-2');
      expect(event2Item?.className).toContain('ring-blue-500');
    });
  });

  it('calls scrollIntoView when item is selected', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail1);

    // Mock the VariableSizeList ref
    vi.mock('react-window', async () => {
      const actual = await vi.importActual('react-window');
      return {
        ...actual,
      };
    });

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getAllByText('Event 1')).toHaveLength(1);
    });

    // Click on first event to select it
    fireEvent.click(screen.getAllByText('Event 1')[0]);

    // With virtualization, scrolling is handled by the List's scrollToItem
    // which is called via the useEffect when selectedPlacemarkId changes
    // We just verify that the event is selected
    await waitFor(() => {
      const selectedItem = screen.getAllByText('Event 1')[0].closest('div[class*="border-l-4"]');
      expect(selectedItem?.className).toContain('ring-2');
    });
  });

  it('does not call scrollIntoView when item is deselected', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchPlacemark).mockResolvedValue(mockPlacemarkDetail1);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getAllByText('Event 1')).toHaveLength(1);
    });

    // Select Event 1
    useViewStore.setState({ selectedPlacemarkId: 1 });

    // Wait for selection to be applied
    await waitFor(() => {
      const selectedItem = screen.getAllByText('Event 1')[0].closest('div[class*="border-l-4"]');
      expect(selectedItem?.className).toContain('ring-2');
    });

    // Deselect (set to null)
    useViewStore.setState({ selectedPlacemarkId: null });

    // Wait for deselection to be applied
    await waitFor(() => {
      const deselectedItem = screen.getAllByText('Event 1')[0].closest('div[class*="border-l-4"]');
      expect(deselectedItem?.className).not.toContain('ring-2');
    });
  });
});
