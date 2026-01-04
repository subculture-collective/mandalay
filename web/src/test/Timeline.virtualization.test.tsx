import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Timeline } from '../components/Timeline';
import { useViewStore } from '../lib/store';
import type { TimelineEvent } from '../types/api';
import type { ReactNode } from 'react';

// Mock the api module
vi.mock('../lib/api', () => ({
  fetchTimelineEvents: vi.fn(),
  fetchPlacemark: vi.fn(),
  fetchFolders: vi.fn(),
}));

// Import after mock to get the mocked version
import { fetchTimelineEvents, fetchFolders } from '../lib/api';

describe('Timeline - Virtualization Performance', () => {
  let queryClient: QueryClient;

  const mockFolders = {
    folders: ['Folder 1'],
    count: 1,
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
    
    // Reset Zustand store state completely
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

  // Helper to generate many mock timeline events
  const generateMockEvents = (count: number): TimelineEvent[] => {
    return Array.from({ length: count }, (_, i) => {
      const totalSeconds = i;
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return {
        timestamp: `2017-10-01T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}Z`,
        name: `Event ${i + 1}`,
        description: `Description for event ${i + 1}`,
        location: { lat: 36.094506 + i * 0.001, lon: -115.172281 + i * 0.001 },
        media_links: [],
        placemark_id: i + 1,
        folder_path: ['Folder 1'],
      };
    });
  };

  it('virtualizes large lists to reduce DOM nodes', async () => {
    // Create a large list of events
    const largeEventList = generateMockEvents(500);
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(largeEventList);

    const { container } = render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('500 of 500 events')).toBeInTheDocument();
    });

    // Count the number of TimelineItem components actually rendered in the DOM
    // Virtualization should only render items visible in the viewport + overscan
    const renderedItems = container.querySelectorAll('div[class*="border-l-4"]');
    
    // With virtualization, we should have significantly fewer items rendered than total
    // The viewport height is 600px (minimum from our config), with estimated item height of 120px
    // We should see roughly 600/120 = 5 items + overscan (3 items) = ~8 items
    // Give some buffer for varying heights
    expect(renderedItems.length).toBeLessThan(20);
    expect(renderedItems.length).toBeGreaterThan(0);
    
    // Verify we still show the correct count in the header
    expect(screen.getByText('500 of 500 events')).toBeInTheDocument();
  });

  it('renders selected item when it becomes visible in viewport', async () => {
    // Create a list where items initially visible include the one we'll select
    const eventList = generateMockEvents(20);
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(eventList);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('20 of 20 events')).toBeInTheDocument();
    });

    // Select an item that's initially visible (e.g., item 3)
    useViewStore.setState({ selectedPlacemarkId: 3 });

    // Wait for selection to be applied
    await waitFor(() => {
      const selectedItemText = screen.queryByText('Event 3');
      expect(selectedItemText).toBeInTheDocument();
    });

    // Verify the item has the selected styling
    const selectedItem = screen.getByText('Event 3').closest('div[class*="border-l-4"]');
    expect(selectedItem?.className).toContain('ring-2');
    expect(selectedItem?.className).toContain('ring-blue-500');
  });

  it('maintains virtualization with filtered lists', async () => {
    // Create a large list
    const largeEventList = generateMockEvents(300);
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(largeEventList);

    const { container } = render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('300 of 300 events')).toBeInTheDocument();
    });

    // Apply a filter
    useViewStore.setState({ searchText: 'Event 1' });

    // Wait for filter to be applied - events 1, 10-19, 100-199
    // This should give us 1 + 10 + 100 = 111 events
    await waitFor(() => {
      const text = screen.getByText(/111 of 300 events/);
      expect(text).toBeInTheDocument();
    });

    // Verify virtualization still limits rendered items
    const renderedItems = container.querySelectorAll('div[class*="border-l-4"]');
    expect(renderedItems.length).toBeGreaterThan(0);
    expect(renderedItems.length).toBeLessThan(50);
  });

  it('displays correct event count', async () => {
    // Start with a list of events
    const eventList = generateMockEvents(10);
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(eventList);

    render(<Timeline />, { wrapper });

    // Wait for initial events to load
    await waitFor(() => {
      expect(screen.getByText('10 of 10 events')).toBeInTheDocument();
    });

    // Verify some events are visible
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 5')).toBeInTheDocument();

    // The virtualized list correctly displays the initial set of events
    const items = screen.getAllByText(/Event \d+/);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(10);
  });

  it('handles empty filtered results gracefully', async () => {
    const eventList = generateMockEvents(50);
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(eventList);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('50 of 50 events')).toBeInTheDocument();
    });

    // Apply a filter that results in no matches
    useViewStore.setState({ searchText: 'NonexistentEvent' });

    // Wait for filter to be applied
    await waitFor(() => {
      expect(screen.getByText('No events match the current filters')).toBeInTheDocument();
    });

    // Verify the empty state message is shown
    expect(screen.queryByText(/Event \d+/)).not.toBeInTheDocument();
  });
});
