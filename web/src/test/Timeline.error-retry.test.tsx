import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const mockFolders = {
  folders: ['Folder 1'],
  count: 1,
};

describe('Timeline - Error Handling and Retry', () => {
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

  it('displays error message when timeline events fail to load', async () => {
    // Mock error response
    const errorMessage = 'Failed to fetch timeline events';
    vi.mocked(fetchTimelineEvents).mockRejectedValueOnce(new Error(errorMessage));

    render(<Timeline />, { wrapper });

    // Wait for error state to appear
    await waitFor(() => {
      expect(screen.getByText('Error Loading Timeline')).toBeInTheDocument();
    });

    // Check that error message is displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // Check that retry button is present
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('displays default error message when error has no message', async () => {
    // Mock error response without message
    vi.mocked(fetchTimelineEvents).mockRejectedValueOnce(new Error());

    render(<Timeline />, { wrapper });

    // Wait for error state to appear
    await waitFor(() => {
      expect(screen.getByText('Error Loading Timeline')).toBeInTheDocument();
    });

    // Check that default error message is displayed
    expect(screen.getByText('Failed to load timeline events')).toBeInTheDocument();
  });

  it('retries fetching timeline events when retry button is clicked', async () => {
    const user = userEvent.setup();

    // Mock initial error, then success
    vi.mocked(fetchTimelineEvents)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockTimelineEvents);

    render(<Timeline />, { wrapper });

    // Wait for error state to appear
    await waitFor(() => {
      expect(screen.getByText('Error Loading Timeline')).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    // Wait for successful load
    await waitFor(() => {
      expect(screen.getByText('Vegas Shooting Timeline')).toBeInTheDocument();
    });

    // Check that events are now displayed
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Verify fetchTimelineEvents was called twice (initial + retry)
    expect(fetchTimelineEvents).toHaveBeenCalledTimes(2);
  });

  it('clears error state after successful retry', async () => {
    const user = userEvent.setup();

    // Mock initial error, then success
    vi.mocked(fetchTimelineEvents)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockTimelineEvents);

    render(<Timeline />, { wrapper });

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Error Loading Timeline')).toBeInTheDocument();
    });

    // Click retry
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    // Wait for success - error should be gone
    await waitFor(() => {
      expect(screen.queryByText('Error Loading Timeline')).not.toBeInTheDocument();
    });

    // Check that normal UI is rendered
    expect(screen.getByText('Vegas Shooting Timeline')).toBeInTheDocument();
    expect(screen.getByText('Event 1')).toBeInTheDocument();
  });

  it('handles multiple retry attempts', async () => {
    const user = userEvent.setup();

    // Mock multiple errors, then success
    vi.mocked(fetchTimelineEvents)
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockResolvedValueOnce(mockTimelineEvents);

    render(<Timeline />, { wrapper });

    // Wait for first error
    await waitFor(() => {
      expect(screen.getByText('Error 1')).toBeInTheDocument();
    });

    // First retry
    await user.click(screen.getByRole('button', { name: /retry/i }));

    // Wait for second error
    await waitFor(() => {
      expect(screen.getByText('Error 2')).toBeInTheDocument();
    });

    // Second retry
    await user.click(screen.getByRole('button', { name: /retry/i }));

    // Wait for success
    await waitFor(() => {
      expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Verify fetchTimelineEvents was called three times
    expect(fetchTimelineEvents).toHaveBeenCalledTimes(3);
  });

  it('does not break UI when error occurs', async () => {
    // Mock error response
    vi.mocked(fetchTimelineEvents).mockRejectedValueOnce(new Error('Test error'));

    render(<Timeline />, { wrapper });

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Error Loading Timeline')).toBeInTheDocument();
    });

    // Verify the UI is still functional and displays error gracefully
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    
    // No unhandled errors should crash the component
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});
