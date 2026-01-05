import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Timeline } from '../components/Timeline';
import { DetailSkeleton } from '../components/skeletons';
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

const mockPlacemarkDetail: PlacemarkDetail = {
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
  media_links: [],
};

describe('Timeline - Detail Panel Skeleton States', () => {
  let queryClient: QueryClient;

  const mockFolders = {
    folders: ['Folder 1'],
    count: 1,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    
    vi.clearAllMocks();
    vi.mocked(fetchFolders).mockResolvedValue(mockFolders);
    vi.mocked(fetchTimelineEvents).mockResolvedValue(mockTimelineEvents);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('DetailSkeleton component renders correctly', () => {
    render(<DetailSkeleton />);
    
    const skeleton = screen.getByTestId('detail-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading event details');
  });

  it('hides detail skeleton on successful detail load', async () => {
    vi.mocked(fetchPlacemark).mockResolvedValue(mockPlacemarkDetail);

    render(<Timeline />, { wrapper });

    // Wait for timeline events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Click on event
    fireEvent.click(screen.getByText('Event 1'));

    // Wait for detail to load
    await waitFor(() => {
      expect(screen.getByText('Detailed description for event 1')).toBeInTheDocument();
    });

    // Skeleton should not be visible after load
    expect(screen.queryByTestId('detail-skeleton')).not.toBeInTheDocument();
  });

  it('hides detail skeleton on error and shows error message', async () => {
    const errorMessage = 'Failed to fetch placemark';
    vi.mocked(fetchPlacemark).mockRejectedValue(new Error(errorMessage));

    render(<Timeline />, { wrapper });

    // Wait for timeline events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Click on event
    fireEvent.click(screen.getByText('Event 1'));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load details')).toBeInTheDocument();
    });

    // Skeleton should not be visible
    expect(screen.queryByTestId('detail-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('maintains stable detail panel layout during loading', async () => {
    vi.mocked(fetchPlacemark).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockPlacemarkDetail), 50))
    );

    const { container } = render(<Timeline />, { wrapper });

    // Wait for timeline events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Get detail panel container before clicking
    const detailPanelBefore = container.querySelector('.lg\\:col-span-1');
    expect(detailPanelBefore).toBeInTheDocument();

    // Click on event
    fireEvent.click(screen.getByText('Event 1'));

    // Wait for detail to load
    await waitFor(() => {
      expect(screen.getByText('Detailed description for event 1')).toBeInTheDocument();
    });

    // Detail panel should still exist after loading
    const detailPanelAfterLoad = container.querySelector('.lg\\:col-span-1');
    expect(detailPanelAfterLoad).toBeInTheDocument();
  });
});
