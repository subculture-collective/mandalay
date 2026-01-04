import { useEffect, useRef } from 'react';
import type { TimelineEvent } from '../types/api';

interface TimelineItemProps {
  event: TimelineEvent;
  onClick: () => void;
  isSelected?: boolean;
  onHeightChange?: (height: number) => void;
}

export function TimelineItem({ event, onClick, isSelected = false, onHeightChange }: TimelineItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const parsedTime = event.timestamp ? new Date(event.timestamp) : null;
  const timeDisplay = parsedTime?.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Report height changes for virtualization
  useEffect(() => {
    if (onHeightChange && itemRef.current) {
      // Only use ResizeObserver if available (not in all test environments)
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            onHeightChange(entry.contentRect.height);
          }
        });
        
        resizeObserver.observe(itemRef.current);
        
        return () => {
          resizeObserver.disconnect();
        };
      } else {
        // Fallback: report height once on mount
        onHeightChange(itemRef.current.offsetHeight);
      }
    }
  }, [onHeightChange]);

  // Note: scrollIntoView is now handled by the virtualized list's scrollToItem
  // Keeping this for backwards compatibility when not virtualized
  useEffect(() => {
    if (isSelected && itemRef.current && !onHeightChange && typeof itemRef.current.scrollIntoView === 'function') {
      itemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [isSelected, onHeightChange]);

  return (
    <div
      ref={itemRef}
      onClick={onClick}
      className={`group relative cursor-pointer border-l-4 bg-white p-4 shadow-sm transition-all ${
        isSelected 
          ? 'border-blue-600 ring-2 ring-blue-500 ring-offset-2 shadow-md bg-blue-50' 
          : 'border-blue-500 hover:border-blue-600 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {timeDisplay && (
              <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {timeDisplay}
              </span>
            )}
            {event.folder_path.length > 0 && (
              <span className="text-xs text-gray-400">
                {event.folder_path[0]}
              </span>
            )}
          </div>
          <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
            {event.name}
          </h3>
          {event.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
              {event.description.substring(0, 150)}
            </p>
          )}
        </div>
        {event.location && (
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        )}
      </div>
      {event.media_links && event.media_links.length > 0 && (
        <div className="mt-2 flex gap-2">
          {event.media_links.map((link, idx) => (
            <a
              key={idx}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Video {idx + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
