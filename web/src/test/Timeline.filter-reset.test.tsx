import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

// Mock data
const mockTimelineEvents: TimelineEvent[] = [
  {
    timestamp: '2017-10-01T21:00:00Z',
    name: 'Event 1',
    description: 'First event description',
    location: { lat: 36.094506, lon: -115.172281 },
    media_links: [],
    placemark_id: 1,
    folder_path: ['Folder A'],
  },
  {
    timestamp: '2017-10-01T21:30:00Z',
    name: 'Event 2',
    description: 'Second event description',
    location: { lat: 36.095506, lon: -115.173281 },
    media_links: [],
    placemark_id: 2,
    folder_path: ['Folder B'],
  },
  {
    timestamp: '2017-10-01T22:00:00Z',
    name: 'Event 3',
    description: 'Third event description',
    location: { lat: 36.096506, lon: -115.174281 },
    media_links: [],
    placemark_id: 3,
    folder_path: ['Folder A'],
  },
  {
    timestamp: null,
    name: 'Event 4 - No timestamp',
    description: 'Fourth event without timestamp',
    location: { lat: 36.097506, lon: -115.175281 },
    media_links: [],
    placemark_id: 4,
    folder_path: ['Folder C'],
  },
];

const mockFolders = {
  folders: ['Folder A', 'Folder B', 'Folder C'],
  count: 3,
};

describe('Timeline - Filter Reset Integration', () => {
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

  it('displays reset button that is disabled when no filters are active', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Reset button should exist and be disabled
    const resetButton = screen.getByRole('button', { name: /reset all filters/i });
    expect(resetButton).toBeInTheDocument();
    expect(resetButton).toBeDisabled();
  });

  it('enables reset button when folder filter is applied', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Apply folder filter
    useViewStore.setState({ selectedFolder: 'Folder A' });

    // Wait for filter to apply
    await waitFor(() => {
      expect(screen.getByText(/2 of 4 events.*filtered/i)).toBeInTheDocument();
    });

    // Reset button should be enabled
    const resetButton = screen.getByRole('button', { name: /reset all filters/i });
    expect(resetButton).not.toBeDisabled();
  });

  it('enables reset button when search filter is applied', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Reset button should be disabled initially
    const resetButton = screen.getByRole('button', { name: /reset all filters/i });
    expect(resetButton).toBeDisabled();

    // Apply search filter
    const searchInput = screen.getByPlaceholderText(/search by name or description/i);
    fireEvent.change(searchInput, { target: { value: 'First' } });

    // Wait for button to be enabled (debounced filter applies to store)
    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    }, { timeout: 500 });
  });

  it('enables reset button when time range filter is applied', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Reset button should be disabled initially
    const resetButton = screen.getByRole('button', { name: /reset all filters/i });
    expect(resetButton).toBeDisabled();

    // Apply time range filter
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:00',
      timeRangeEnd: '2017-10-01T21:45',
    });

    // Wait for filter to be applied and button to be enabled
    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    });
  });

  it('clears folder filter when reset button is clicked', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Apply folder filter
    useViewStore.setState({ selectedFolder: 'Folder A' });

    // Wait for filter to apply
    await waitFor(() => {
      expect(screen.getByText(/2 of 4 events.*filtered/i)).toBeInTheDocument();
    });

    // Only Events 1 and 3 should be visible
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.queryByText('Event 2')).not.toBeInTheDocument();
    expect(screen.getByText('Event 3')).toBeInTheDocument();
    expect(screen.queryByText('Event 4 - No timestamp')).not.toBeInTheDocument();

    // Click reset button
    const resetButton = screen.getByRole('button', { name: /reset all filters/i });
    fireEvent.click(resetButton);

    // Wait for all events to be visible again
    await waitFor(() => {
      expect(screen.getByText(/4 of 4 events/)).toBeInTheDocument();
    });

    // All events should be visible
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.getByText('Event 3')).toBeInTheDocument();
    expect(screen.getByText('Event 4 - No timestamp')).toBeInTheDocument();

    // Folder filter control should show "All folders"
    const folderSelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(folderSelect.value).toBe('');
  });

  it('clears search filter when reset button is clicked', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Apply search filter
    const searchInput = screen.getByPlaceholderText(/search by name or description/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Second' } });

    // Wait for search text to be set in store (debounced)
    await waitFor(() => {
      expect(useViewStore.getState().searchText).toBe('Second');
    }, { timeout: 500 });

    // Click reset button
    const resetButton = screen.getByRole('button', { name: /reset all filters/i });
    fireEvent.click(resetButton);

    // Wait for store to be reset
    await waitFor(() => {
      expect(useViewStore.getState().searchText).toBe('');
    });

    // All events should be visible again
    await waitFor(() => {
      expect(screen.getByText(/4 of 4 events/)).toBeInTheDocument();
    });
  });

  it('clears time range filter when reset button is clicked', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Apply time range filter
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:15',
      timeRangeEnd: '2017-10-01T21:45',
    });

    // Verify filter is set in store
    expect(useViewStore.getState().timeRangeStart).toBe('2017-10-01T21:15');
    expect(useViewStore.getState().timeRangeEnd).toBe('2017-10-01T21:45');

    // Wait for reset button to be enabled
    const resetButton = screen.getByRole('button', { name: /reset all filters/i });
    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    });

    // Click reset button
    fireEvent.click(resetButton);

    // Wait for store to be reset
    await waitFor(() => {
      expect(useViewStore.getState().timeRangeStart).toBeNull();
      expect(useViewStore.getState().timeRangeEnd).toBeNull();
    });

    // All events should be visible again
    await waitFor(() => {
      expect(screen.getByText(/4 of 4 events/)).toBeInTheDocument();
    });
  });

  it('clears all filters simultaneously when reset button is clicked', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Apply multiple filters
    const searchInput = screen.getByPlaceholderText(/search by name or description/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Event' } });
    
    useViewStore.setState({ 
      selectedFolder: 'Folder A',
      timeRangeStart: '2017-10-01T21:00',
      timeRangeEnd: '2017-10-01T21:30',
    });

    // Wait for filters to apply
    await waitFor(() => {
      // With folder=Folder A, search=Event, and time range, only Event 1 matches
      expect(screen.getByText(/1 of 4 events.*filtered/i)).toBeInTheDocument();
    }, { timeout: 500 });

    // Click reset button
    const resetButton = screen.getByRole('button', { name: /reset all filters/i });
    fireEvent.click(resetButton);

    // Wait for all events to be visible again
    await waitFor(() => {
      expect(screen.getByText(/4 of 4 events/)).toBeInTheDocument();
    });

    // All events should be visible
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.getByText('Event 3')).toBeInTheDocument();
    expect(screen.getByText('Event 4 - No timestamp')).toBeInTheDocument();

    // All filter controls should be cleared in the store
    const state = useViewStore.getState();
    expect(state.selectedFolder).toBeNull();
    expect(state.searchText).toBe('');
    expect(state.timeRangeStart).toBeNull();
    expect(state.timeRangeEnd).toBeNull();
  });

  it('disables reset button after clearing filters', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Apply a filter
    useViewStore.setState({ selectedFolder: 'Folder A' });

    // Wait for filter to apply
    await waitFor(() => {
      expect(screen.getByText(/2 of 4 events.*filtered/i)).toBeInTheDocument();
    });

    // Reset button should be enabled
    const resetButton = screen.getByRole('button', { name: /reset all filters/i });
    expect(resetButton).not.toBeDisabled();

    // Click reset button
    fireEvent.click(resetButton);

    // Wait for reset to complete
    await waitFor(() => {
      expect(screen.getByText(/4 of 4 events/)).toBeInTheDocument();
    });

    // Reset button should be disabled again
    expect(resetButton).toBeDisabled();
  });

  it('resets includeNullTimestamps to default value', async () => {
    vi.mocked(fetchTimelineEvents).mockResolvedValueOnce(mockTimelineEvents);
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<Timeline />, { wrapper });

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    // Apply time range filter and change includeNullTimestamps
    useViewStore.setState({ 
      timeRangeStart: '2017-10-01T21:00',
      includeNullTimestamps: false,
    });

    // Wait for filter to apply
    await waitFor(() => {
      // Event 4 should be excluded because includeNullTimestamps is false
      expect(screen.queryByText('Event 4 - No timestamp')).not.toBeInTheDocument();
    });

    // Click reset button
    const resetButton = screen.getByRole('button', { name: /reset all filters/i });
    fireEvent.click(resetButton);

    // Wait for reset to complete
    await waitFor(() => {
      expect(screen.getByText(/4 of 4 events/)).toBeInTheDocument();
    });

    // includeNullTimestamps should be reset to true
    expect(useViewStore.getState().includeNullTimestamps).toBe(true);
  });
});
