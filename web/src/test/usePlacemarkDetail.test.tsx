import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '../lib/queryClient';
import { usePlacemarkDetail, placemarkDetailQueryKey } from '../lib/usePlacemarkDetail';
import type { PlacemarkDetail } from '../types/api';
import type { ReactNode } from 'react';

// Mock the api module
vi.mock('../lib/api', () => ({
  fetchPlacemark: vi.fn(),
}));

// Import after mock to get the mocked version
import { fetchPlacemark } from '../lib/api';

const mockPlacemarkDetail: PlacemarkDetail = {
  id: 123,
  name: 'Test Placemark',
  description: 'This is a test placemark description',
  style_id: 'icon-1538-0288D1',
  folder_path: ['Videos taken on foot'],
  timestamp: '2017-10-01T21:41:56Z',
  location: {
    type: 'Point',
    coordinates: [-115.172281, 36.094506],
  },
  media_links: ['https://youtube.com/watch?v=test123'],
};

describe('usePlacemarkDetail', () => {
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

  it('does not fetch when id is null', async () => {
    const { result } = renderHook(() => usePlacemarkDetail(null), { wrapper });

    // Should not be loading and should not have called the API
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);
    expect(fetchPlacemark).not.toHaveBeenCalled();

    // Wait a bit to ensure no fetch happens
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchPlacemark).not.toHaveBeenCalled();
  });

  it('does not fetch when id is undefined', async () => {
    const { result } = renderHook(() => usePlacemarkDetail(undefined), { wrapper });

    // Should not be loading and should not have called the API
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);
    expect(fetchPlacemark).not.toHaveBeenCalled();

    // Wait a bit to ensure no fetch happens
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchPlacemark).not.toHaveBeenCalled();
  });

  it('fetches placemark detail successfully when id is provided', async () => {
    // Mock successful response
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail);

    const { result } = renderHook(() => usePlacemarkDetail(123), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check that data is loaded correctly
    expect(result.current.data).toEqual(mockPlacemarkDetail);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchPlacemark).toHaveBeenCalledTimes(1);
    expect(fetchPlacemark).toHaveBeenCalledWith(123);
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
    const errorMessage = 'Failed to fetch placemark';
    vi.mocked(fetchPlacemark).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => usePlacemarkDetail(123), { wrapper: customWrapper });

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

  it('reuses cached data on duplicate calls with same id', async () => {
    // Mock successful response
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail);

    // First hook call
    const { result: result1 } = renderHook(() => usePlacemarkDetail(123), { wrapper });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    expect(result1.current.data).toEqual(mockPlacemarkDetail);
    expect(fetchPlacemark).toHaveBeenCalledTimes(1);

    // Second hook call with same id - should use cache, not make another request
    const { result: result2 } = renderHook(() => usePlacemarkDetail(123), { wrapper });

    // Should have data immediately from cache (not loading)
    await waitFor(() => {
      expect(result2.current.data).toEqual(mockPlacemarkDetail);
    });

    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.data).toEqual(mockPlacemarkDetail);
    // Should still be 1 call, not 2, because of cache
    expect(fetchPlacemark).toHaveBeenCalledTimes(1);
  });

  it('fetches different placemarks with different ids separately', async () => {
    const mockPlacemark2: PlacemarkDetail = {
      ...mockPlacemarkDetail,
      id: 456,
      name: 'Different Placemark',
    };

    // Mock responses for different placemarks
    vi.mocked(fetchPlacemark)
      .mockResolvedValueOnce(mockPlacemarkDetail)
      .mockResolvedValueOnce(mockPlacemark2);

    // First hook call with id 123
    const { result: result1 } = renderHook(() => usePlacemarkDetail(123), { wrapper });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    expect(result1.current.data).toEqual(mockPlacemarkDetail);
    expect(fetchPlacemark).toHaveBeenCalledTimes(1);
    expect(fetchPlacemark).toHaveBeenCalledWith(123);

    // Second hook call with different id 456
    const { result: result2 } = renderHook(() => usePlacemarkDetail(456), { wrapper });

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(result2.current.data).toEqual(mockPlacemark2);
    // Should have made 2 calls total, one for each id
    expect(fetchPlacemark).toHaveBeenCalledTimes(2);
    expect(fetchPlacemark).toHaveBeenCalledWith(456);
  });

  it('refetch functionality works correctly', async () => {
    // Mock successful responses
    vi.mocked(fetchPlacemark)
      .mockResolvedValueOnce(mockPlacemarkDetail)
      .mockResolvedValueOnce({
        ...mockPlacemarkDetail,
        name: 'Updated Placemark Name',
      });

    const { result } = renderHook(() => usePlacemarkDetail(123), { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPlacemarkDetail);
    expect(fetchPlacemark).toHaveBeenCalledTimes(1);

    // Trigger refetch
    await result.current.refetch();

    // Wait for refetch to complete
    await waitFor(() => {
      expect(result.current.data?.name).toBe('Updated Placemark Name');
    });

    expect(fetchPlacemark).toHaveBeenCalledTimes(2);
    expect(fetchPlacemark).toHaveBeenCalledWith(123);
  });

  it('uses correct query key per id', async () => {
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail);

    const { result } = renderHook(() => usePlacemarkDetail(123), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check that the query key is correctly set in the cache
    const cachedData = queryClient.getQueryData(placemarkDetailQueryKey(123));
    expect(cachedData).toEqual(mockPlacemarkDetail);

    // Different id should have different cache entry
    const cachedData456 = queryClient.getQueryData(placemarkDetailQueryKey(456));
    expect(cachedData456).toBeUndefined();
  });

  it('has appropriate cache configuration for relatively-static data', async () => {
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail);

    const { result } = renderHook(() => usePlacemarkDetail(123), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Get query state to check configuration
    const queryState = queryClient.getQueryState(placemarkDetailQueryKey(123));

    expect(queryState).toBeDefined();
    // Data should be cached
    expect(queryState?.data).toEqual(mockPlacemarkDetail);
  });

  it('returns all expected properties', async () => {
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail);

    const { result } = renderHook(() => usePlacemarkDetail(123), { wrapper });

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

  it('transitions from disabled to enabled when id changes from null to valid', async () => {
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail);

    // Start with null id
    const { result, rerender } = renderHook(
      ({ id }: { id: number | null }) => usePlacemarkDetail(id),
      {
        wrapper,
        initialProps: { id: null as number | null },
      }
    );

    // Should not be loading or fetching
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(fetchPlacemark).not.toHaveBeenCalled();

    // Change to valid id
    rerender({ id: 123 });

    // Should now be loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPlacemarkDetail);
    expect(fetchPlacemark).toHaveBeenCalledTimes(1);
    expect(fetchPlacemark).toHaveBeenCalledWith(123);
  });

  it('retains cached data when transitioning from valid id to null', async () => {
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail);

    // Start with valid id
    const { result, rerender } = renderHook(
      ({ id }: { id: number | null }) => usePlacemarkDetail(id),
      {
        wrapper,
        initialProps: { id: 123 as number | null },
      }
    );

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPlacemarkDetail);
    expect(fetchPlacemark).toHaveBeenCalledTimes(1);

    // Change to null id
    rerender({ id: null });

    // Query should be disabled (not loading)
    expect(result.current.isLoading).toBe(false);
    
    // Data should still be in cache (even though hook might not expose it)
    const cachedData = queryClient.getQueryData(placemarkDetailQueryKey(123));
    expect(cachedData).toEqual(mockPlacemarkDetail);
    
    // If we re-enable with the same id, it should use cache
    rerender({ id: 123 });
    
    // Should immediately have data from cache
    await waitFor(() => {
      expect(result.current.data).toEqual(mockPlacemarkDetail);
    });
    
    // Should not have made another API call
    expect(fetchPlacemark).toHaveBeenCalledTimes(1);
  });
});
