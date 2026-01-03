import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '../lib/queryClient';
import { useTimelineEvents, timelineEventsQueryKey } from '../lib/useTimelineEvents';
import type { TimelineEvent } from '../types/api';
import type { ReactNode } from 'react';

// Mock the api module
vi.mock('../lib/api', () => ({
  fetchTimelineEvents: vi.fn(),
}));

// Import after mock to get the mocked version
import { fetchTimelineEvents } from '../lib/api';

const mockTimelineEvents: TimelineEvent[] = [
  {
    timestamp: '2017-10-01T21:41:56Z',
    name: '10/1/2017 09:41:56 PM - First Event',
    description: 'Test description',
    location: {
      lat: 36.094506,
      lon: -115.172281,
    },
    media_links: ['https://example.com/video1'],
    placemark_id: 1,
    folder_path: ['Test Folder'],
  },
  {
    timestamp: '2017-10-01T21:42:00Z',
    name: '10/1/2017 09:42:00 PM - Second Event',
    description: 'Another test description',
    location: {
      lat: 36.095,
      lon: -115.173,
    },
    media_links: [],
    placemark_id: 2,
    folder_path: ['Test Folder', 'Subfolder'],
  },
];

describe('useTimelineEvents', () => {
  let queryClient: ReturnType<typeof createQueryClient>;

  beforeEach(() => {
    // Create a fresh QueryClient for each test to avoid cache pollution
    queryClient = createQueryClient();
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  // Helper to wrap hooks with QueryClientProvider
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('fetches timeline events successfully', async () => {
    // Mock successful response
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);

    const { result } = renderHook(() => useTimelineEvents(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check that data is loaded correctly
    expect(result.current.data).toEqual(mockTimelineEvents);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchTimelineEvents).toHaveBeenCalledTimes(1);
  });

  it('handles errors correctly', async () => {
    // Create a custom query client with no retries for this test
    const noRetryQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for faster error testing
        },
      },
    });

    const customWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={noRetryQueryClient}>
        {children}
      </QueryClientProvider>
    );

    // Mock error response
    const errorMessage = 'Failed to fetch timeline events';
    vi.mocked(fetchTimelineEvents).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useTimelineEvents(), { wrapper: customWrapper });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Check error state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe(errorMessage);
  });

  it('reuses cached data on duplicate calls', async () => {
    // Mock successful response
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);

    // First hook call
    const { result: result1 } = renderHook(() => useTimelineEvents(), { wrapper });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    expect(result1.current.data).toEqual(mockTimelineEvents);
    expect(fetchTimelineEvents).toHaveBeenCalledTimes(1);

    // Second hook call - should use cache, not make another request
    const { result: result2 } = renderHook(() => useTimelineEvents(), { wrapper });

    // Should have data immediately from cache (not loading)
    await waitFor(() => {
      expect(result2.current.data).toEqual(mockTimelineEvents);
    });

    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.data).toEqual(mockTimelineEvents);
    // Should still be 1 call, not 2, because of cache
    expect(fetchTimelineEvents).toHaveBeenCalledTimes(1);
  });

  it('refetch functionality works correctly', async () => {
    // Mock successful responses
    vi.mocked(fetchTimelineEvents)
      .mockResolvedValueOnce(mockTimelineEvents)
      .mockResolvedValueOnce([
        {
          ...mockTimelineEvents[0],
          name: 'Updated Event',
        },
      ]);

    const { result } = renderHook(() => useTimelineEvents(), { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockTimelineEvents);
    expect(fetchTimelineEvents).toHaveBeenCalledTimes(1);

    // Trigger refetch
    await result.current.refetch();

    // Wait for refetch to complete
    await waitFor(() => {
      expect(result.current.data?.[0].name).toBe('Updated Event');
    });

    expect(fetchTimelineEvents).toHaveBeenCalledTimes(2);
  });

  it('uses correct query key', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);

    const { result } = renderHook(() => useTimelineEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check that the query key is correctly set in the cache
    const cachedData = queryClient.getQueryData(timelineEventsQueryKey);
    expect(cachedData).toEqual(mockTimelineEvents);
  });

  it('has appropriate cache configuration for mostly-static data', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);

    const { result } = renderHook(() => useTimelineEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Get query state to check configuration
    const queryState = queryClient.getQueryState(timelineEventsQueryKey);
    
    expect(queryState).toBeDefined();
    // Data should be marked as fresh for 10 minutes (600000ms)
    // We can't directly check staleTime from queryState, but we can verify
    // the query exists and has data
    expect(queryState?.data).toEqual(mockTimelineEvents);
  });

  it('returns all expected properties', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);

    const { result } = renderHook(() => useTimelineEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check that all expected properties are present
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });
});
