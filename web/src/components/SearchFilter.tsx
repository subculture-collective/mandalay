import { useState, useEffect } from 'react';
import { useViewStore } from '../lib/store';

/**
 * Debounced search filter component for timeline events.
 * Filters events by name and description with configurable debounce delay.
 */
export function SearchFilter() {
  const { searchText, setSearchText } = useViewStore();
  const [inputValue, setInputValue] = useState(searchText);

  // Debounce the search text update to the store
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchText(inputValue);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [inputValue, setSearchText]);

  // When searchText is cleared externally (e.g., reset button), sync the input
  // This only triggers when searchText becomes empty, avoiding cascading updates
  useEffect(() => {
    if (searchText === '' && inputValue !== '') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue('');
    }
  }, [searchText, inputValue]);

  const handleClear = () => {
    setInputValue('');
    setSearchText('');
  };

  return (
    <div className="relative">
      <label htmlFor="search-filter" className="sr-only">
        Search events
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          id="search-filter"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search by name or description..."
          className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
