import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { FolderFilter } from '../components/FolderFilter';
import { useViewStore } from '../lib/store';

// Mock the api module
vi.mock('../lib/api', () => ({
  fetchFolders: vi.fn(),
}));

// Import after mock to get the mocked version
import { fetchFolders } from '../lib/api';

describe('FolderFilter', () => {
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
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Reset Zustand store state
    useViewStore.setState({ selectedFolder: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and displays folders on mount', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<FolderFilter />);

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Check that all folders are in the dropdown
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options).toHaveLength(6); // 5 folders + "All folders" option

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

    render(<FolderFilter />);

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Select a folder
    fireEvent.change(select, { target: { value: 'Videos taken on foot' } });

    // Check that store was updated
    await waitFor(() => {
      expect(useViewStore.getState().selectedFolder).toBe('Videos taken on foot');
    });

    // Check that clear button appears
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('displays selected folder indicator', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<FolderFilter />);

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Select a folder
    fireEvent.change(select, { target: { value: 'Audio (911 calls)' } });

    // Check that indicator appears using getAllByText and checking for the strong element
    await waitFor(() => {
      expect(screen.getByText(/filtering by:/i)).toBeInTheDocument();
      const elements = screen.getAllByText('Audio (911 calls)');
      // One in select option, one in the indicator
      expect(elements.length).toBeGreaterThan(1);
    });
  });

  it('clears filter when Clear button is clicked', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    // Set initial selected folder
    useViewStore.setState({ selectedFolder: 'Videos taken on foot' });

    render(<FolderFilter />);

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Clear button should be visible
    const clearButton = screen.getByText('Clear');
    expect(clearButton).toBeInTheDocument();

    // Click clear button
    fireEvent.click(clearButton);

    // Check that store was updated
    await waitFor(() => {
      expect(useViewStore.getState().selectedFolder).toBe(null);
    });

    // Clear button should no longer be visible
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('resets to "All folders" when selecting empty value', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    // Set initial selected folder
    useViewStore.setState({ selectedFolder: 'Videos taken on foot' });

    render(<FolderFilter />);

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

    render(<FolderFilter />);

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

    render(<FolderFilter />);

    // Dropdown should be disabled while loading
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select).toBeDisabled();
  });

  it('reflects store changes from external sources', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce(mockFolders);

    render(<FolderFilter />);

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

    render(<FolderFilter />);

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Clear button should not be visible
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('handles empty folder list gracefully', async () => {
    vi.mocked(fetchFolders).mockResolvedValueOnce({ folders: [], count: 0 });

    render(<FolderFilter />);

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
