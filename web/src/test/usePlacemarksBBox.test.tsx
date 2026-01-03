import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '../lib/queryClient';
import { usePlacemarksBBox, placemarksBBoxQueryKey } from '../lib/usePlacemarksBBox';
import type { BBox, BBoxResponse, Placemark } from '../types/api';
import type { ReactNode } from 'react';

// Mock the api module
vi.mock('../lib/api', () => ({
  fetchPlacemarksBBox: vi.fn(),
}));

// Import after mock to get the mocked version
import { fetchPlacemarksBBox } from '../lib/api';

const mockBBox: BBox = {
  min_lon: -115.18,
  min_lat: 36.09,
  max_lon: -115.16,
  max_lat: 36.10,
};

const mockPlacemark: Placemark = {
  id: 1,
  name: 'Test Placemark',
  description: 'Test description',
  style_id: 'icon-123',
  folder_path: ['Test Folder'],
  geometry_type: 'Point',
  geometry: 'POINT(-115.172281 36.094506)',
  media_links: [],
  created_at: '2023-01-01T00:00:00Z',
};

const mockBBoxResponse: BBoxResponse = {
  placemarks: [mockPlacemark],
  bbox: mockBBox,
  count: 1,
};

describe('usePlacemarksBBox', () => {
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

  it('does not fetch when bbox is null', async () => {
    const { result } = renderHook(() => usePlacemarksBBox(null), { wrapper });

    // Should not be loading and should not have called the API
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);
    expect(fetchPlacemarksBBox).not.toHaveBeenCalled();

    // Wait a bit to ensure no fetch happens
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchPlacemarksBBox).not.toHaveBeenCalled();
  });

  it('does not fetch when bbox is undefined', async () => {
    const { result } = renderHook(() => usePlacemarksBBox(undefined), { wrapper });

    // Should not be loading and should not have called the API
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);
    expect(fetchPlacemarksBBox).not.toHaveBeenCalled();

    // Wait a bit to ensure no fetch happens
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchPlacemarksBBox).not.toHaveBeenCalled();
  });

  it('fetches placemarks successfully when bbox is provided', async () => {
    // Mock successful response
    vi.mocked(fetchPlacemarksBBox).mockResolvedValueOnce(mockBBoxResponse);

    const { result } = renderHook(() => usePlacemarksBBox(mockBBox), { wrapper });

    // Initially should be debouncing (not loading yet)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();

    // Wait for debounce and query to complete
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeDefined();
      },
      { timeout: 1000 }
    );

    // Check that data is loaded correctly
    expect(result.current.data).toEqual(mockBBoxResponse);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);
    expect(fetchPlacemarksBBox).toHaveBeenCalledWith({
      ...mockBBox,
      limit: undefined,
    });
  });

  it('includes limit parameter when provided', async () => {
    // Mock successful response
    vi.mocked(fetchPlacemarksBBox).mockResolvedValueOnce(mockBBoxResponse);

    const { result } = renderHook(
      () => usePlacemarksBBox(mockBBox, { limit: 50 }),
      { wrapper }
    );

    // Wait for debounce and query to complete
    await waitFor(
      () => {
        expect(result.current.data).toBeDefined();
      },
      { timeout: 1000 }
    );

    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);
    expect(fetchPlacemarksBBox).toHaveBeenCalledWith({
      ...mockBBox,
      limit: 50,
    });
  });

  it('includes limit: 0 as a valid parameter', async () => {
    // Mock successful response
    vi.mocked(fetchPlacemarksBBox).mockResolvedValueOnce(mockBBoxResponse);

    const { result } = renderHook(
      () => usePlacemarksBBox(mockBBox, { limit: 0 }),
      { wrapper }
    );

    // Wait for debounce and query to complete
    await waitFor(
      () => {
        expect(result.current.data).toBeDefined();
      },
      { timeout: 1000 }
    );

    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);
    expect(fetchPlacemarksBBox).toHaveBeenCalledWith({
      ...mockBBox,
      limit: 0,
    });
  });

  it('debounces rapid bbox changes and only fetches the last value', async () => {
    vi.mocked(fetchPlacemarksBBox).mockResolvedValue(mockBBoxResponse);

    const bbox1: BBox = { min_lon: -115.2, min_lat: 36.0, max_lon: -115.1, max_lat: 36.1 };
    const bbox2: BBox = { min_lon: -115.3, min_lat: 36.05, max_lon: -115.2, max_lat: 36.15 };
    const bbox3: BBox = { min_lon: -115.4, min_lat: 36.1, max_lon: -115.3, max_lat: 36.2 };

    const { rerender } = renderHook(
      ({ bbox }: { bbox: BBox | null }) => usePlacemarksBBox(bbox),
      {
        wrapper,
        initialProps: { bbox: bbox1 },
      }
    );

    // Rapidly change bbox
    rerender({ bbox: bbox2 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    rerender({ bbox: bbox3 });

    // Wait for debounce to settle
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Wait for query to complete
    await waitFor(
      () => {
        expect(fetchPlacemarksBBox).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    // Should only have been called once with the last bbox
    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);
    expect(fetchPlacemarksBBox).toHaveBeenCalledWith({
      ...bbox3,
      limit: undefined,
    });
  });

  it('uses custom debounce delay when provided', async () => {
    vi.mocked(fetchPlacemarksBBox).mockResolvedValue(mockBBoxResponse);

    const bbox1: BBox = { min_lon: -115.2, min_lat: 36.0, max_lon: -115.1, max_lat: 36.1 };
    const bbox2: BBox = { min_lon: -115.3, min_lat: 36.05, max_lon: -115.2, max_lat: 36.15 };

    const { rerender } = renderHook(
      ({ bbox }: { bbox: BBox | null }) => usePlacemarksBBox(bbox, { debounceMs: 100 }),
      {
        wrapper,
        initialProps: { bbox: bbox1 },
      }
    );

    // Rapidly change bbox
    rerender({ bbox: bbox2 });

    // Wait shorter than default debounce but longer than custom
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Wait for query to complete
    await waitFor(
      () => {
        expect(fetchPlacemarksBBox).toHaveBeenCalled();
      },
      { timeout: 500 }
    );

    // Should have been called with the last bbox
    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);
    expect(fetchPlacemarksBBox).toHaveBeenCalledWith({
      ...bbox2,
      limit: undefined,
    });
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
    const errorMessage = 'Failed to fetch placemarks by bbox';
    vi.mocked(fetchPlacemarksBBox).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => usePlacemarksBBox(mockBBox), {
      wrapper: customWrapper,
    });

    // Wait for debounce and query to complete
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 1000 }
    );

    // Check error state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe(errorMessage);
  });

  it('uses different cache entries for different bboxes', async () => {
    const bbox2: BBox = {
      min_lon: -115.3,
      min_lat: 36.05,
      max_lon: -115.2,
      max_lat: 36.15,
    };

    const mockResponse2: BBoxResponse = {
      ...mockBBoxResponse,
      count: 2,
    };

    // Mock responses for different bboxes
    vi.mocked(fetchPlacemarksBBox)
      .mockResolvedValueOnce(mockBBoxResponse)
      .mockResolvedValueOnce(mockResponse2);

    // First hook call with bbox1
    const { result: result1 } = renderHook(() => usePlacemarksBBox(mockBBox), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result1.current.data).toBeDefined();
      },
      { timeout: 1000 }
    );

    expect(result1.current.data).toEqual(mockBBoxResponse);
    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);

    // Second hook call with different bbox
    const { result: result2 } = renderHook(() => usePlacemarksBBox(bbox2), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result2.current.data).toBeDefined();
      },
      { timeout: 1000 }
    );

    expect(result2.current.data).toEqual(mockResponse2);
    // Should have made 2 calls total, one for each bbox
    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(2);
  });

  it('reuses cached data for same bbox', async () => {
    // Mock successful response
    vi.mocked(fetchPlacemarksBBox).mockResolvedValueOnce(mockBBoxResponse);

    // First hook call
    const { result: result1 } = renderHook(() => usePlacemarksBBox(mockBBox), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result1.current.data).toBeDefined();
      },
      { timeout: 1000 }
    );

    expect(result1.current.data).toEqual(mockBBoxResponse);
    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);

    // Second hook call with same bbox - should use cache
    const { result: result2 } = renderHook(() => usePlacemarksBBox(mockBBox), {
      wrapper,
    });

    // Should have data immediately from cache
    await waitFor(
      () => {
        expect(result2.current.data).toEqual(mockBBoxResponse);
      },
      { timeout: 1000 }
    );

    expect(result2.current.isLoading).toBe(false);
    // Should still be 1 call, not 2, because of cache
    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);
  });

  it('refetch functionality works correctly', async () => {
    // Mock successful responses
    vi.mocked(fetchPlacemarksBBox)
      .mockResolvedValueOnce(mockBBoxResponse)
      .mockResolvedValueOnce({
        ...mockBBoxResponse,
        count: 2,
      });

    const { result } = renderHook(() => usePlacemarksBBox(mockBBox), { wrapper });

    // Wait for initial load
    await waitFor(
      () => {
        expect(result.current.data).toBeDefined();
      },
      { timeout: 1000 }
    );

    expect(result.current.data).toEqual(mockBBoxResponse);
    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);

    // Trigger refetch
    await result.current.refetch();

    // Wait for refetch to complete
    await waitFor(
      () => {
        expect(result.current.data?.count).toBe(2);
      },
      { timeout: 1000 }
    );

    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(2);
  });

  it('uses correct query key per bbox and limit', async () => {
    vi.mocked(fetchPlacemarksBBox).mockResolvedValueOnce(mockBBoxResponse);

    const { result } = renderHook(
      () => usePlacemarksBBox(mockBBox, { limit: 50 }),
      { wrapper }
    );

    await waitFor(
      () => {
        expect(result.current.data).toBeDefined();
      },
      { timeout: 1000 }
    );

    // Check that the query key is correctly set in the cache
    const cachedData = queryClient.getQueryData(
      placemarksBBoxQueryKey(mockBBox, 50)
    );
    expect(cachedData).toEqual(mockBBoxResponse);

    // Different limit should have different cache entry
    const cachedData100 = queryClient.getQueryData(
      placemarksBBoxQueryKey(mockBBox, 100)
    );
    expect(cachedData100).toBeUndefined();
  });

  it('respects enabled option when false', async () => {
    vi.mocked(fetchPlacemarksBBox).mockResolvedValueOnce(mockBBoxResponse);

    const { result } = renderHook(
      () => usePlacemarksBBox(mockBBox, { enabled: false }),
      { wrapper }
    );

    // Wait for debounce period
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Should not have called the API
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(fetchPlacemarksBBox).not.toHaveBeenCalled();
  });

  it('returns all expected properties', async () => {
    vi.mocked(fetchPlacemarksBBox).mockResolvedValueOnce(mockBBoxResponse);

    const { result } = renderHook(() => usePlacemarksBBox(mockBBox), { wrapper });

    await waitFor(
      () => {
        expect(result.current.data).toBeDefined();
      },
      { timeout: 1000 }
    );

    // Check that all expected properties are present
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('transitions from disabled to enabled when bbox changes from null to valid', async () => {
    vi.mocked(fetchPlacemarksBBox).mockResolvedValueOnce(mockBBoxResponse);

    // Start with null bbox
    const { result, rerender } = renderHook(
      ({ bbox }: { bbox: BBox | null }) => usePlacemarksBBox(bbox),
      {
        wrapper,
        initialProps: { bbox: null },
      }
    );

    // Should not be loading or fetching
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(fetchPlacemarksBBox).not.toHaveBeenCalled();

    // Change to valid bbox
    rerender({ bbox: mockBBox });

    // Wait for debounce and query to complete
    await waitFor(
      () => {
        expect(result.current.data).toBeDefined();
      },
      { timeout: 1000 }
    );

    expect(result.current.data).toEqual(mockBBoxResponse);
    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);
  });

  it('retains cached data when transitioning from valid bbox to null', async () => {
    vi.mocked(fetchPlacemarksBBox).mockResolvedValueOnce(mockBBoxResponse);

    // Start with valid bbox
    const { result, rerender } = renderHook(
      ({ bbox }: { bbox: BBox | null }) => usePlacemarksBBox(bbox),
      {
        wrapper,
        initialProps: { bbox: mockBBox },
      }
    );

    // Wait for the query to complete
    await waitFor(
      () => {
        expect(result.current.data).toBeDefined();
      },
      { timeout: 1000 }
    );

    expect(result.current.data).toEqual(mockBBoxResponse);
    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);

    // Change to null bbox
    rerender({ bbox: null });

    // Query should be disabled (not loading)
    expect(result.current.isLoading).toBe(false);

    // Data should still be in cache
    const cachedData = queryClient.getQueryData(placemarksBBoxQueryKey(mockBBox));
    expect(cachedData).toEqual(mockBBoxResponse);

    // If we re-enable with the same bbox, it should use cache
    rerender({ bbox: mockBBox });

    // Should immediately have data from cache
    await waitFor(
      () => {
        expect(result.current.data).toEqual(mockBBoxResponse);
      },
      { timeout: 1000 }
    );

    // Should not have made another API call
    expect(fetchPlacemarksBBox).toHaveBeenCalledTimes(1);
  });
});
