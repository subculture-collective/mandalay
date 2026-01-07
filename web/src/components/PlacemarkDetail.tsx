import { useState, useEffect, useRef } from 'react';
import type { PlacemarkDetail as PlacemarkDetailType, GeoJSONGeometry } from '../types/api';

interface PlacemarkDetailProps {
  detail: PlacemarkDetailType;
}

/**
 * Extracts lat/lon coordinates from GeoJSON geometry
 * Returns null if coordinates cannot be extracted
 */
function extractLatLon(geometry: GeoJSONGeometry): { lat: number; lon: number } | null {
  // Only extract coordinates from Point geometries
  if (geometry.type !== 'Point') {
    return null;
  }
  
  const coords = geometry.coordinates;
  
  // Handle Point geometry: [lon, lat]
  if (Array.isArray(coords) && coords.length >= 2) {
    const [lon, lat] = coords;
    if (typeof lon === 'number' && typeof lat === 'number') {
      return { lat, lon };
    }
  }
  
  return null;
}

/**
 * Format timestamp with timezone awareness
 * Returns a localized date-time string with timezone
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  
  // Use Intl.DateTimeFormat for better timezone handling
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
  
  return formatter.format(date);
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers or when clipboard API is not available
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackError) {
      console.error('Failed to copy to clipboard:', fallbackError);
      return false;
    }
  }
}

export function PlacemarkDetail({ detail }: PlacemarkDetailProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopyCoordinates = async () => {
    if (!detail.location) return;
    
    const latLon = extractLatLon(detail.location);
    if (!latLon) return;
    
    const coordText = `${latLon.lat.toFixed(6)},${latLon.lon.toFixed(6)}`;
    const success = await copyToClipboard(coordText);
    
    if (success) {
      setCopied(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout and store reference for cleanup
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-gray-700 mb-1">Name</h3>
        <p className="text-gray-900">{detail.name}</p>
      </div>

      {detail.timestamp && (
        <div>
          <h3 className="font-medium text-gray-700 mb-1">Time</h3>
          <p className="text-gray-900 text-sm">
            {formatTimestamp(detail.timestamp)}
          </p>
        </div>
      )}

      {detail.description && (
        <div>
          <h3 className="font-medium text-gray-700 mb-1">Description</h3>
          <div className="text-sm text-gray-900 prose prose-sm max-w-none">
            {detail.description}
          </div>
        </div>
      )}

      {detail.folder_path.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Category</h3>
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2">
              {detail.folder_path.map((folder, index) => (
                <li key={`${folder}-${index}`} className="inline-flex items-center">
                  {index > 0 && (
                    <svg
                      className="w-3 h-3 text-gray-400 mx-1"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 6 10"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="m1 9 4-4-4-4"
                      />
                    </svg>
                  )}
                  <span className="text-sm text-gray-600">{folder}</span>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}

      {(() => {
        if (!detail.location) {
          return null;
        }
        const latLon = extractLatLon(detail.location);
        if (!latLon) {
          return null;
        }
        return (
          <div>
            <h3 className="font-medium text-gray-700 mb-1">Coordinates</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600 font-mono">
                {`${latLon.lat.toFixed(6)}, ${latLon.lon.toFixed(6)}`}
              </p>
              <button
                onClick={handleCopyCoordinates}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                aria-label="Copy coordinates to clipboard"
              >
                {copied ? (
                  <>
                    <svg
                      className="w-3 h-3 mr-1 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })()}

      {detail.media_links && detail.media_links.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Media</h3>
          <div className="space-y-2">
            {detail.media_links
              .map((link: string, idx: number) => {
                // Validate URL and ensure it uses safe protocols
                let url: URL;
                try {
                  url = new URL(link);
                } catch {
                  // Skip invalid URLs
                  return null;
                }

                if (!/^https?:$/i.test(url.protocol)) {
                  // Skip URLs with unsafe protocols
                  return null;
                }

                return {
                  safeHref: url.toString(),
                  originalLink: link,
                  originalIndex: idx,
                };
              })
              .filter((item): item is { safeHref: string; originalLink: string; originalIndex: number } => item !== null)
              .map((item, displayIndex) => (
                <a
                  key={`media-${item.originalIndex}`}
                  href={item.safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {item.originalLink.includes('youtube') ? 'YouTube Video' : 'Media'} {displayIndex + 1}
                </a>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
