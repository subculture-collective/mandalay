import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlacemarkDetail } from '../components/PlacemarkDetail';
import type { PlacemarkDetail as PlacemarkDetailType } from '../types/api';

const mockPlacemarkDetail: PlacemarkDetailType = {
  id: 123,
  name: 'Test Placemark',
  description: 'This is a test placemark description',
  style_id: 'icon-1538-0288D1',
  folder_path: ['Videos taken on foot', 'Mandalay Bay', 'Floor 32'],
  timestamp: '2017-10-01T21:41:56Z',
  location: {
    type: 'Point',
    coordinates: [-115.172281, 36.094506],
  },
  media_links: ['https://youtube.com/watch?v=test123', 'https://example.com/media.jpg'],
};

describe('PlacemarkDetail', () => {
  let originalClipboard: typeof navigator.clipboard;

  beforeEach(() => {
    // Save original clipboard
    originalClipboard = navigator.clipboard;
  });

  afterEach(() => {
    // Restore original clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it('renders placemark name', () => {
    render(<PlacemarkDetail detail={mockPlacemarkDetail} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Test Placemark')).toBeInTheDocument();
  });

  it('renders formatted timestamp with timezone', () => {
    render(<PlacemarkDetail detail={mockPlacemarkDetail} />);
    expect(screen.getByText('Time')).toBeInTheDocument();
    
    // Check that the timestamp is displayed (format may vary by locale)
    const timeElement = screen.getByText(/2017/);
    expect(timeElement).toBeInTheDocument();
    // Should include some timezone indicator (e.g., GMT, UTC, PDT, etc.)
    expect(timeElement.textContent).toMatch(/[A-Z]{2,4}/);
  });

  it('renders description when present', () => {
    render(<PlacemarkDetail detail={mockPlacemarkDetail} />);
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('This is a test placemark description')).toBeInTheDocument();
  });

  it('renders breadcrumbs for folder path', () => {
    render(<PlacemarkDetail detail={mockPlacemarkDetail} />);
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Videos taken on foot')).toBeInTheDocument();
    expect(screen.getByText('Mandalay Bay')).toBeInTheDocument();
    expect(screen.getByText('Floor 32')).toBeInTheDocument();
    
    // Check breadcrumb structure
    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(breadcrumb).toBeInTheDocument();
  });

  it('renders coordinates with copy button', () => {
    render(<PlacemarkDetail detail={mockPlacemarkDetail} />);
    expect(screen.getByText('Coordinates')).toBeInTheDocument();
    expect(screen.getByText('36.094506, -115.172281')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy coordinates/i })).toBeInTheDocument();
  });

  it('copies coordinates to clipboard and shows confirmation', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.fn(() => Promise.resolve());
    
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextSpy,
      },
      configurable: true,
      writable: true,
    });
    
    render(<PlacemarkDetail detail={mockPlacemarkDetail} />);
    
    const copyButton = screen.getByRole('button', { name: /copy coordinates/i });
    await user.click(copyButton);
    
    // Check that clipboard API was called with correct format
    expect(writeTextSpy).toHaveBeenCalledWith('36.094506,-115.172281');
    
    // Check for visual confirmation
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
    
    // Confirmation should disappear after timeout
    await waitFor(
      () => {
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('shows copy button for coordinates', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.fn(() => Promise.resolve());
    
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextSpy,
      },
      configurable: true,
      writable: true,
    });
    
    render(<PlacemarkDetail detail={mockPlacemarkDetail} />);
    
    const copyButton = screen.getByRole('button', { name: /copy coordinates/i });
    expect(copyButton).toBeInTheDocument();
    
    // Button should be functional
    await user.click(copyButton);
    expect(writeTextSpy).toHaveBeenCalled();
  });

  it('renders media links when present', () => {
    render(<PlacemarkDetail detail={mockPlacemarkDetail} />);
    expect(screen.getByText('Media')).toBeInTheDocument();
    
    const youtubeLink = screen.getByText('YouTube Video 1');
    expect(youtubeLink).toHaveAttribute('href', 'https://youtube.com/watch?v=test123');
    expect(youtubeLink).toHaveAttribute('target', '_blank');
    expect(youtubeLink).toHaveAttribute('rel', 'noopener noreferrer');
    
    const mediaLink = screen.getByText('Media 2');
    expect(mediaLink).toHaveAttribute('href', 'https://example.com/media.jpg');
  });

  it('handles missing timestamp gracefully', () => {
    const detailWithoutTimestamp: PlacemarkDetailType = {
      ...mockPlacemarkDetail,
      timestamp: undefined,
    };
    render(<PlacemarkDetail detail={detailWithoutTimestamp} />);
    expect(screen.queryByText('Time')).not.toBeInTheDocument();
  });

  it('handles missing description gracefully', () => {
    const detailWithoutDescription: PlacemarkDetailType = {
      ...mockPlacemarkDetail,
      description: undefined,
    };
    render(<PlacemarkDetail detail={detailWithoutDescription} />);
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('handles empty folder path gracefully', () => {
    const detailWithoutFolders: PlacemarkDetailType = {
      ...mockPlacemarkDetail,
      folder_path: [],
    };
    render(<PlacemarkDetail detail={detailWithoutFolders} />);
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('handles missing location gracefully', () => {
    const detailWithoutLocation: PlacemarkDetailType = {
      ...mockPlacemarkDetail,
      location: undefined,
    };
    render(<PlacemarkDetail detail={detailWithoutLocation} />);
    expect(screen.queryByText('Coordinates')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy coordinates/i })).not.toBeInTheDocument();
  });

  it('handles missing media links gracefully', () => {
    const detailWithoutMedia: PlacemarkDetailType = {
      ...mockPlacemarkDetail,
      media_links: undefined,
    };
    render(<PlacemarkDetail detail={detailWithoutMedia} />);
    expect(screen.queryByText('Media')).not.toBeInTheDocument();
  });

  it('handles empty media links array gracefully', () => {
    const detailWithEmptyMedia: PlacemarkDetailType = {
      ...mockPlacemarkDetail,
      media_links: [],
    };
    render(<PlacemarkDetail detail={detailWithEmptyMedia} />);
    expect(screen.queryByText('Media')).not.toBeInTheDocument();
  });

  it('renders only name when all optional fields are missing', () => {
    const minimalDetail: PlacemarkDetailType = {
      id: 456,
      name: 'Minimal Placemark',
      folder_path: [],
    };
    render(<PlacemarkDetail detail={minimalDetail} />);
    
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Minimal Placemark')).toBeInTheDocument();
    expect(screen.queryByText('Time')).not.toBeInTheDocument();
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
    expect(screen.queryByText('Coordinates')).not.toBeInTheDocument();
    expect(screen.queryByText('Media')).not.toBeInTheDocument();
  });

  it('handles single folder in breadcrumbs', () => {
    const detailWithSingleFolder: PlacemarkDetailType = {
      ...mockPlacemarkDetail,
      folder_path: ['Single Folder'],
    };
    render(<PlacemarkDetail detail={detailWithSingleFolder} />);
    
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Single Folder')).toBeInTheDocument();
  });

  it('formats coordinates with correct precision', () => {
    render(<PlacemarkDetail detail={mockPlacemarkDetail} />);
    
    // Coordinates should be formatted to 6 decimal places
    const coordText = screen.getByText('36.094506, -115.172281');
    expect(coordText).toBeInTheDocument();
  });

  it('formats timestamp correctly for different timezones', () => {
    // Test with a different timestamp
    const detailWithDifferentTime: PlacemarkDetailType = {
      ...mockPlacemarkDetail,
      timestamp: '2017-12-25T12:00:00Z',
    };
    render(<PlacemarkDetail detail={detailWithDifferentTime} />);
    
    const timeElement = screen.getByText(/2017/);
    expect(timeElement).toBeInTheDocument();
    // Should contain Dec or December
    expect(timeElement.textContent).toMatch(/Dec/i);
  });

  it('renders component with all required props', () => {
    render(<PlacemarkDetail detail={mockPlacemarkDetail} />);
    
    // Component should render without errors
    expect(screen.getByText('Test Placemark')).toBeInTheDocument();
  });

  it('handles non-Point geometry gracefully', () => {
    const detailWithLineString: PlacemarkDetailType = {
      ...mockPlacemarkDetail,
      location: {
        type: 'LineString',
        coordinates: [[-115.172281, 36.094506], [-115.172282, 36.094507]],
      },
    };
    render(<PlacemarkDetail detail={detailWithLineString} />);
    
    // Should not render coordinates section for non-Point geometry
    expect(screen.queryByText('Coordinates')).not.toBeInTheDocument();
  });

  it('displays breadcrumb separators correctly', () => {
    render(<PlacemarkDetail detail={mockPlacemarkDetail} />);
    
    const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb/i });
    const svgSeparators = breadcrumbNav.querySelectorAll('svg');
    
    // Should have 2 separators for 3 folders (n-1 separators)
    expect(svgSeparators).toHaveLength(2);
  });

  it('filters out media links with unsafe protocols', () => {
    const detailWithUnsafeLinks: PlacemarkDetailType = {
      ...mockPlacemarkDetail,
      media_links: [
        'https://safe.com/video.mp4',
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'http://also-safe.com/image.jpg',
      ],
    };
    render(<PlacemarkDetail detail={detailWithUnsafeLinks} />);
    
    // Should only render links with safe protocols (http, https)
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://safe.com/video.mp4');
    expect(links[1]).toHaveAttribute('href', 'http://also-safe.com/image.jpg');
  });

  it('filters out invalid URLs in media links', () => {
    const detailWithInvalidLinks: PlacemarkDetailType = {
      ...mockPlacemarkDetail,
      media_links: [
        'https://valid.com/video.mp4',
        'not a valid url',
        'also invalid',
        'https://another-valid.com/image.jpg',
      ],
    };
    render(<PlacemarkDetail detail={detailWithInvalidLinks} />);
    
    // Should only render valid URLs
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://valid.com/video.mp4');
    expect(links[1]).toHaveAttribute('href', 'https://another-valid.com/image.jpg');
  });
});
