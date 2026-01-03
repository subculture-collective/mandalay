import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { FolderFilter } from '../components/FolderFilter';
import { useViewStore } from '../lib/store';
import type { ReactNode } from 'react';

// Mock the api module
vi.mock('../lib/api', () => ({
  fetchFolders: vi.fn(),
}));

// Import after mock to get the mocked version
import { fetchFolders } from '../lib/api';

describe('FolderFilter', () => {
  let queryClient: QueryClient;

  const mockFolders = {
    folders: [
      'Audio (911 calls)',
      'Videos taken on foot',
      'LVMPD Body Worn Cameras',
      'Places of Interest',
      'Victims',
    ],
    count: 5,
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
    
    // Reset Zustand store state
    useViewStore.setState({ selectedFolder: null });
  });

  afterEach(() => {
    // Clean up query client
    queryClient.clear();
    vi.clearAllMocks();
  });

  // Helper to wrap component with providers
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('fetches and displays folders on mount', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<FolderFilter />, { wrapper });

    // Wait for folders to load and be displayed
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.options).toHaveLength(6); // 5 folders + "All folders" option
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Check that "All folders" is the default option
    expect(select.options[0].value).toBe('');
    expect(select.options[0].text).toBe('All folders');

    // Check that all folders are present
    mockFolders.folders.forEach((folder, index) => {
      expect(select.options[index + 1].value).toBe(folder);
      expect(select.options[index + 1].text).toBe(folder);
    });

    expect(fetchFolders).toHaveBeenCalledTimes(1);
  });

  it('updates store when folder is selected', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<FolderFilter />, { wrapper });

    // Wait for folders to load
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.options.length).toBeGreaterThan(1);
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Select a folder
    fireEvent.change(select, { target: { value: 'Videos taken on foot' } });

    // Check that store was updated
    await waitFor(() => {
      expect(useViewStore.getState().selectedFolder).toBe('Videos taken on foot');
    });

    // Check that combined clear button/indicator appears
    expect(screen.getByText('Filtering:')).toBeInTheDocument();
    const elements = screen.getAllByText('Videos taken on foot');
    // One in select option, one in the combined button
    expect(elements.length).toBe(2);
  });

  it('displays selected folder indicator', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<FolderFilter />, { wrapper });

    // Wait for folders to load
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.options.length).toBeGreaterThan(1);
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Select a folder
    fireEvent.change(select, { target: { value: 'Audio (911 calls)' } });

    // Check that combined indicator/clear button appears
    await waitFor(() => {
      expect(screen.getByText('Filtering:')).toBeInTheDocument();
      const elements = screen.getAllByText('Audio (911 calls)');
      // One in select option, one in the combined button
      expect(elements.length).toBeGreaterThan(1);
    });
  });

  it('clears filter when clear button is clicked', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    // Set initial selected folder
    useViewStore.setState({ selectedFolder: 'Videos taken on foot' });

    render(<FolderFilter />, { wrapper });

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Combined clear button/indicator should be visible
    const clearButton = screen.getByRole('button', { name: /clear folder filter/i });
    expect(clearButton).toBeInTheDocument();

    // Click clear button
    fireEvent.click(clearButton);

    // Check that store was updated
    await waitFor(() => {
      expect(useViewStore.getState().selectedFolder).toBe(null);
    });

    // Clear button should no longer be visible
    expect(screen.queryByRole('button', { name: /clear folder filter/i })).not.toBeInTheDocument();
  });

  it('resets to "All folders" when selecting empty value', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    // Set initial selected folder
    useViewStore.setState({ selectedFolder: 'Videos taken on foot' });

    render(<FolderFilter />, { wrapper });

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Select "All folders"
    fireEvent.change(select, { target: { value: '' } });

    // Check that store was updated
    await waitFor(() => {
      expect(useViewStore.getState().selectedFolder).toBe(null);
    });
  });

  it('handles API error gracefully', async () => {
    vi.mocked(fetchFolders).mockRejectedValueOnce(new Error('Network error'));

    render(<FolderFilter />, { wrapper });

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to load folders/i)).toBeInTheDocument();
    });

    // Dropdown should not be present
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('disables dropdown while loading', () => {
    vi.mocked(fetchFolders).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockFolders), 1000))
    );

    render(<FolderFilter />, { wrapper });

    // Dropdown should be disabled while loading
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select).toBeDisabled();
  });

  it('reflects store changes from external sources', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<FolderFilter />, { wrapper });

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Initially no folder selected
    expect(select.value).toBe('');

    // Update store externally (e.g., from another component)
    useViewStore.setState({ selectedFolder: 'Places of Interest' });

    // Check that select reflects the change
    await waitFor(() => {
      expect(select.value).toBe('Places of Interest');
    });
  });

  it('does not show clear button when no folder is selected', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<FolderFilter />, { wrapper });

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Clear button should not be visible
    expect(screen.queryByRole('button', { name: /clear folder filter/i })).not.toBeInTheDocument();
  });

  it('handles empty folder list gracefully', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce({ folders: [], count: 0 });

    render(<FolderFilter />, { wrapper });

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Should only have "All folders" option
    expect(select.options).toHaveLength(1);
    expect(select.options[0].text).toBe('All folders');
  });
});
