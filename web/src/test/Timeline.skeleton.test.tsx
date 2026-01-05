import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Timeline } from '../components/Timeline';
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

const mockTimelineEvents: TimelineEvent[] = [
  {
    timestamp: '2017-10-01T21:41:56Z',
    name: 'Event 1',
    description: 'First event description',
    location: { lat: 36.094506, lon: -115.172281 },
    media_links: [],
    placemark_id: 1,
    folder_path: ['Folder 1'],
  },
];

describe('Timeline - Skeleton Loading States', () => {
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
  });

  // Helper to wrap component with providers
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('shows timeline item skeletons during initial loading', async () => {
    // Mock a delayed response
    vi.mocked(fetchTimelineEvents).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockTimelineEvents), 100))
    );

    render(<Timeline />, { wrapper });

    // Should show skeleton items
    const skeletons = screen.getAllByTestId('timeline-item-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
    
    // Check for loading indicator in title area
    expect(screen.getByText(/Loading events/i)).toBeInTheDocument();

    // Wait for events to load and skeletons to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('timeline-item-skeleton')).not.toBeInTheDocument();
    });
    
    // Verify actual content is shown
    expect(screen.getByText('Event 1')).toBeInTheDocument();
  });

  it('maintains stable layout dimensions during skeleton to content transition', async () => {
    vi.mocked(fetchTimelineEvents).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockTimelineEvents), 50))
    );

    const { container } = render(<Timeline />, { wrapper });

    // Get the grid container
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
    
    // The layout should maintain its structure during loading
    const timelineColumn = container.querySelector('.lg\\:col-span-2');
    expect(timelineColumn).toBeInTheDocument();
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });
    
    // Layout structure should still exist after loading
    const gridAfterLoad = container.querySelector('.grid');
    expect(gridAfterLoad).toBeInTheDocument();
    
    const timelineColumnAfterLoad = container.querySelector('.lg\\:col-span-2');
    expect(timelineColumnAfterLoad).toBeInTheDocument();
  });

  it('does not show skeletons when data is already loaded', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Should not have any skeletons
    expect(screen.queryByTestId('timeline-item-skeleton')).not.toBeInTheDocument();
  });

  it('shows error state instead of skeletons on fetch failure', async () => {
    const errorMessage = 'Failed to load timeline events';
    vi.mocked(fetchTimelineEvents).mockRejectedValueOnce(new Error(errorMessage));

    render(<Timeline />, { wrapper });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/Error Loading Timeline/i)).toBeInTheDocument();
    });

    // Should show error, not skeletons
    expect(screen.queryByTestId('timeline-item-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
