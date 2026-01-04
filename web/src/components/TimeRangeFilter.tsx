import { useViewStore } from '../lib/store';

/**
 * Time range filter component for filtering timeline events by timestamp.
 * Allows users to set start and end time bounds and control visibility of null timestamp events.
 */
export function TimeRangeFilter() {
  const { 
    timeRangeStart, 
    timeRangeEnd, 
    includeNullTimestamps,
    setTimeRange,
    setIncludeNullTimestamps,
  } = useViewStore();

  const handleStartChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value || null;
    setTimeRange(value, timeRangeEnd);
  };

  const handleEndChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value || null;
    setTimeRange(timeRangeStart, value);
  };

  const handleToggleNullTimestamps = () => {
    setIncludeNullTimestamps(!includeNullTimestamps);
  };

  const handleClearFilter = () => {
    setTimeRange(null, null);
  };

  const hasActiveFilter = timeRangeStart !== null || timeRangeEnd !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-medium text-gray-700">
          Time range:
        </label>
        <div className="flex items-center gap-2">
          <label htmlFor="time-range-start" className="text-sm text-gray-600">
            From:
          </label>
          <input
            id="time-range-start"
            type="datetime-local"
            value={timeRangeStart || ''}
            onChange={handleStartChange}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="time-range-end" className="text-sm text-gray-600">
            To:
          </label>
          <input
            id="time-range-end"
            type="datetime-local"
            value={timeRangeEnd || ''}
            onChange={handleEndChange}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {hasActiveFilter && (
          <button
            onClick={handleClearFilter}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            aria-label="Clear time range filter"
          >
            Clear time filter
            <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {hasActiveFilter && (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeNullTimestamps}
              onChange={handleToggleNullTimestamps}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              aria-label="Include events without timestamps"
            />
            <span>Include events without timestamps</span>
          </label>
        </div>
      )}
    </div>
  );
}
