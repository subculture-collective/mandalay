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
    name: 'First Shooting Event',
    description: 'Detailed description about the first shooting incident',
    location: { lat: 36.094506, lon: -115.172281 },
    media_links: ['https://youtube.com/watch?v=test1'],
    placemark_id: 1,
    folder_path: ['Videos taken on foot'],
  },
  {
    timestamp: '2017-10-01T21:42:56Z',
    name: 'Second Audio Recording',
    description: 'Audio recording of 911 call',
    location: { lat: 36.095506, lon: -115.173281 },
    media_links: [],
    placemark_id: 2,
    folder_path: ['Audio (911 calls)'],
  },
  {
    timestamp: '2017-10-01T21:43:56Z',
    name: 'Third Video Footage',
    description: 'Video taken from nearby building',
    location: { lat: 36.096506, lon: -115.174281 },
    media_links: [],
    placemark_id: 3,
    folder_path: ['Videos taken on foot'],
  },
  {
    timestamp: '2017-10-01T21:44:56Z',
    name: 'Place of Interest',
    description: 'Important location marker',
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
  name: 'First Shooting Event',
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

describe('Timeline - Search Filter with Debounce', () => {
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
    useViewStore.setState({ 
      selectedPlacemarkId: null, 
      selectedFolder: null,
      searchText: '',
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

  it('displays all events when search is empty', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    });

    // All 4 events should be visible
    expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    expect(screen.getByText('Second Audio Recording')).toBeInTheDocument();
    expect(screen.getByText('Third Video Footage')).toBeInTheDocument();
    expect(screen.getByText('Place of Interest')).toBeInTheDocument();
  });

  it('filters events by name after debounce delay', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    });

    // Find search input
    const searchInput = screen.getByPlaceholderText(/search by name or description/i);

    // Type search text
    fireEvent.change(searchInput, { target: { value: 'shooting' } });

    // Wait for debounce delay and filter to apply (300ms + some buffer)
    await waitFor(() => {
      expect(screen.queryByText('Second Audio Recording')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Only events with "shooting" in name should be visible
    expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    expect(screen.queryByText('Second Audio Recording')).not.toBeInTheDocument();
    expect(screen.queryByText('Third Video Footage')).not.toBeInTheDocument();
    expect(screen.queryByText('Place of Interest')).not.toBeInTheDocument();
  });

  it('filters events by description after debounce delay', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or description/i);

    // Search for text that appears in description only
    fireEvent.change(searchInput, { target: { value: '911' } });

    // Wait for debounce and filter to apply
    await waitFor(() => {
      expect(screen.queryByText('First Shooting Event')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Only event with "911" in description should be visible
    expect(screen.queryByText('First Shooting Event')).not.toBeInTheDocument();
    expect(screen.getByText('Second Audio Recording')).toBeInTheDocument();
    expect(screen.queryByText('Third Video Footage')).not.toBeInTheDocument();
  });

  it('is case-insensitive when searching', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or description/i);

    // Search with mixed case
    fireEvent.change(searchInput, { target: { value: 'VIDEO' } });

    await waitFor(() => {
      expect(screen.queryByText('First Shooting Event')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Should match "Video" in name/description
    expect(screen.queryByText('First Shooting Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Second Audio Recording')).not.toBeInTheDocument();
    expect(screen.getByText('Third Video Footage')).toBeInTheDocument();
    expect(screen.queryByText('Place of Interest')).not.toBeInTheDocument();
  });

  it('handles events with undefined description correctly', async () => {
    // Create events where one has undefined description
    const eventsWithUndefinedDesc: TimelineEvent[] = [
      {
        timestamp: '2017-10-01T21:41:56Z',
        name: 'First Test Event',
        description: 'This event has searchable content in description',
        location: { lat: 36.094506, lon: -115.172281 },
        media_links: [],
        placemark_id: 1,
        folder_path: ['Test'],
      },
      {
        timestamp: '2017-10-01T21:42:56Z',
        name: 'Second Test Event',
        description: undefined,
        location: { lat: 36.095506, lon: -115.173281 },
        media_links: [],
        placemark_id: 2,
        folder_path: ['Test'],
      },
    ];

    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(eventsWithUndefinedDesc);
    vi.mocked(fetchFolders).mockResolvedValueOnce({ folders: ['Test'], count: 1 });

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('First Test Event')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or description/i);

    // Search for text that only appears in the description of the first event
    fireEvent.change(searchInput, { target: { value: 'searchable content' } });

    await waitFor(() => {
      expect(screen.queryByText('Second Test Event')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Only the event with matching description should be visible
    expect(screen.getByText('First Test Event')).toBeInTheDocument();
    expect(screen.queryByText('Second Test Event')).not.toBeInTheDocument();
  });

  it('debounces rapid typing and only filters on final value', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or description/i);

    // Simulate rapid typing
    fireEvent.change(searchInput, { target: { value: 'a' } });
    fireEvent.change(searchInput, { target: { value: 'au' } });
    fireEvent.change(searchInput, { target: { value: 'aud' } });
    fireEvent.change(searchInput, { target: { value: 'audi' } });
    fireEvent.change(searchInput, { target: { value: 'audio' } });

    // Wait for debounce and final filter
    await waitFor(() => {
      expect(screen.queryByText('First Shooting Event')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Only the final search value "audio" should be applied
    expect(screen.queryByText('First Shooting Event')).not.toBeInTheDocument();
    expect(screen.getByText('Second Audio Recording')).toBeInTheDocument();
    expect(screen.queryByText('Third Video Footage')).not.toBeInTheDocument();
  });

  it('clears filter when search input is cleared', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or description/i);

    // Apply search filter
    fireEvent.change(searchInput, { target: { value: 'shooting' } });

    await waitFor(() => {
      expect(screen.queryByText('Second Audio Recording')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Clear the search by clicking clear button
    const clearButton = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearButton);

    // All events should be visible again
    await waitFor(() => {
      expect(screen.getByText('Second Audio Recording')).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    expect(screen.getByText('Second Audio Recording')).toBeInTheDocument();
    expect(screen.getByText('Third Video Footage')).toBeInTheDocument();
    expect(screen.getByText('Place of Interest')).toBeInTheDocument();
  });

  it('combines search filter with folder filter', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    });

    // Apply folder filter first
    useViewStore.setState({ selectedFolder: 'Videos taken on foot' });

    await waitFor(() => {
      expect(screen.queryByText('Second Audio Recording')).not.toBeInTheDocument();
    });

    // Events 1 and 3 should be visible (from "Videos taken on foot" folder)
    expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    expect(screen.getByText('Third Video Footage')).toBeInTheDocument();

    // Now apply search filter
    const searchInput = screen.getByPlaceholderText(/search by name or description/i);
    fireEvent.change(searchInput, { target: { value: 'shooting' } });

    await waitFor(() => {
      expect(screen.queryByText('Third Video Footage')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Only Event 1 should be visible (matches both folder and search)
    expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    expect(screen.queryByText('Second Audio Recording')).not.toBeInTheDocument();
    expect(screen.queryByText('Third Video Footage')).not.toBeInTheDocument();
    expect(screen.queryByText('Place of Interest')).not.toBeInTheDocument();
  });

  it('allows selecting filtered events', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);
    vi.mocked(fetchPlacemark).mockResolvedValueOnce(mockPlacemarkDetail);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    });

    // Apply search filter
    const searchInput = screen.getByPlaceholderText(/search by name or description/i);
    fireEvent.change(searchInput, { target: { value: 'shooting' } });

    await waitFor(() => {
      expect(screen.queryByText('Second Audio Recording')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Click on filtered event
    fireEvent.click(screen.getByText('First Shooting Event'));

    // Wait for detail to load
    await waitFor(() => {
      expect(screen.getByText('Detailed description')).toBeInTheDocument();
    });

    // Verify API was called
    expect(fetchPlacemark).toHaveBeenCalledWith(1);
  });

  it('shows no events when search matches nothing', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or description/i);

    // Search for something that doesn't exist
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.queryByText('First Shooting Event')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // No events should be visible
    expect(screen.queryByText('First Shooting Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Second Audio Recording')).not.toBeInTheDocument();
    expect(screen.queryByText('Third Video Footage')).not.toBeInTheDocument();
    expect(screen.queryByText('Place of Interest')).not.toBeInTheDocument();
  });

  it('maintains search filter across selection changes', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);
    vi.mocked(fetchPlacemark).mockResolvedValue(mockPlacemarkDetail);

    render(<Timeline />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('First Shooting Event')).toBeInTheDocument();
    });

    // Apply search filter
    const searchInput = screen.getByPlaceholderText(/search by name or description/i);
    fireEvent.change(searchInput, { target: { value: 'video' } });

    await waitFor(() => {
      expect(screen.queryByText('First Shooting Event')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Select an event
    fireEvent.click(screen.getByText('Third Video Footage'));

    // Filter should still be active
    await waitFor(() => {
      expect(screen.queryByText('First Shooting Event')).not.toBeInTheDocument();
      expect(screen.getByText('Third Video Footage')).toBeInTheDocument();
    });
  });
});
