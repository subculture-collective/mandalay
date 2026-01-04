import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Map } from '../components/Map';

// Mock the new components
vi.mock('../components/MapBoundsHandler', () => ({
  MapBoundsHandler: () => <div data-testid="mock-bounds-handler" />,
}));

vi.mock('../components/PlacemarkMarkers', () => ({
  PlacemarkMarkers: () => <div data-testid="mock-placemark-markers" />,
}));

vi.mock('../lib/usePlacemarksBBox', () => ({
  usePlacemarksBBox: () => ({
    data: null,
    isLoading: false,
    isError: false,
  }),
}));

// Mock react-leaflet to avoid issues with Leaflet in jsdom
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="mock-map-container" {...props}>
      {children}
    </div>
  ),
  TileLayer: ({ url, attribution }: { url?: string; attribution?: string }) => (
    <div data-testid="mock-tile-layer" data-url={url} data-attribution={attribution} />
  ),
  useMap: () => ({
    invalidateSize: vi.fn(),
  }),
}));

// Mock leaflet
vi.mock('leaflet', () => ({
  default: {
    icon: vi.fn(() => ({})),
    Marker: {
      prototype: {
        options: {},
      },
    },
  },
}));

describe('Map Component', () => {
  beforeEach(() => {
    // Clear any previously set env variables
    vi.unstubAllEnvs();
  });

  it('renders without crashing', () => {
    render(<Map />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('renders MapContainer and TileLayer', () => {
    render(<Map />);
    expect(screen.getByTestId('mock-map-container')).toBeInTheDocument();
    expect(screen.getByTestId('mock-tile-layer')).toBeInTheDocument();
  });

  it('uses default tile URL when env variable is not set', () => {
    render(<Map />);
    const tileLayer = screen.getByTestId('mock-tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  });

  it('uses default attribution when env variable is not set', () => {
    render(<Map />);
    const tileLayer = screen.getByTestId('mock-tile-layer');
    expect(tileLayer).toHaveAttribute(
      'data-attribution',
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    );
  });

  it('uses custom tile URL from env variable', () => {
    vi.stubEnv('VITE_MAP_TILE_URL', 'https://custom-tiles.example.com/{z}/{x}/{y}.png');
    render(<Map />);
    const tileLayer = screen.getByTestId('mock-tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://custom-tiles.example.com/{z}/{x}/{y}.png');
  });

  it('uses custom attribution from env variable', () => {
    vi.stubEnv('VITE_MAP_ATTRIBUTION', 'Custom Map Provider');
    render(<Map />);
    const tileLayer = screen.getByTestId('mock-tile-layer');
    expect(tileLayer).toHaveAttribute('data-attribution', 'Custom Map Provider');
  });

  it('appends API key to tile URL when provided (uses default parameter name)', () => {
    vi.stubEnv('VITE_MAP_TILE_URL', 'https://tiles.example.com/{z}/{x}/{y}.png');
    vi.stubEnv('VITE_MAP_API_KEY', 'test-api-key-123');
    // Not setting VITE_MAP_API_KEY_PARAM - should default to 'apikey'
    render(<Map />);
    const tileLayer = screen.getByTestId('mock-tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://tiles.example.com/{z}/{x}/{y}.png?apikey=test-api-key-123');
  });

  it('uses & separator when tile URL already contains query parameters', () => {
    vi.stubEnv('VITE_MAP_TILE_URL', 'https://tiles.example.com/{z}/{x}/{y}.png?style=basic');
    vi.stubEnv('VITE_MAP_API_KEY', 'test-key');
    render(<Map />);
    const tileLayer = screen.getByTestId('mock-tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://tiles.example.com/{z}/{x}/{y}.png?style=basic&apikey=test-key');
  });

  it('uses custom API key parameter name when provided', () => {
    vi.stubEnv('VITE_MAP_TILE_URL', 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}');
    vi.stubEnv('VITE_MAP_API_KEY', 'pk.test123');
    vi.stubEnv('VITE_MAP_API_KEY_PARAM', 'access_token');
    render(<Map />);
    const tileLayer = screen.getByTestId('mock-tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.test123');
  });

  it('uses default center (Las Vegas) when not provided', () => {
    render(<Map />);
    const mapContainer = screen.getByTestId('mock-map-container');
    expect(mapContainer).toBeInTheDocument();
  });

  it('accepts custom center prop', () => {
    render(<Map center={[40.7128, -74.0060]} />); // New York City
    const mapContainer = screen.getByTestId('mock-map-container');
    expect(mapContainer).toBeInTheDocument();
  });

  it('accepts custom zoom prop', () => {
    render(<Map zoom={10} />);
    const mapContainer = screen.getByTestId('mock-map-container');
    expect(mapContainer).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Map className="custom-map-class" />);
    const container = screen.getByTestId('map-container');
    expect(container).toHaveClass('custom-map-class');
  });

  it('applies default className when not provided', () => {
    render(<Map />);
    const container = screen.getByTestId('map-container');
    expect(container).toHaveClass('h-96', 'w-full');
  });

  it('mounts and unmounts cleanly without errors', () => {
    const { unmount } = render(<Map />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    
    // Should unmount without throwing
    expect(() => unmount()).not.toThrow();
  });

  it('handles all env variables together', () => {
    vi.stubEnv('VITE_MAP_TILE_URL', 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}');
    vi.stubEnv('VITE_MAP_ATTRIBUTION', 'Map data &copy; Mapbox');
    vi.stubEnv('VITE_MAP_API_KEY', 'pk.test123');
    
    render(<Map />);
    const tileLayer = screen.getByTestId('mock-tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?apikey=pk.test123');
    expect(tileLayer).toHaveAttribute('data-attribution', 'Map data &copy; Mapbox');
  });
});
