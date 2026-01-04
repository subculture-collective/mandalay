import { useViewStore } from '../lib/store';

/**
 * Button to reset all timeline filters to their default values.
 * Shows disabled state when no filters are active.
 */
export function FilterResetButton() {
  const { 
    selectedFolder, 
    searchText, 
    timeRangeStart, 
    timeRangeEnd,
    resetFilters 
  } = useViewStore();

  // Determine if any filters are active
  const hasActiveFilters = 
    selectedFolder !== null || 
    searchText.trim() !== '' || 
    timeRangeStart !== null || 
    timeRangeEnd !== null;

  const handleReset = () => {
    resetFilters();
  };

  return (
    <button
      onClick={handleReset}
      disabled={!hasActiveFilters}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        hasActiveFilters
          ? 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          : 'text-gray-400 bg-gray-100 cursor-not-allowed'
      }`}
      aria-label="Reset all filters"
    >
      <svg 
        className="h-4 w-4" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        aria-hidden="true"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
        />
      </svg>
      Reset All Filters
    </button>
  );
}
