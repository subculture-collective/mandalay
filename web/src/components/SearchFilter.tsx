import { useState, useEffect, useRef } from 'react';
import { useViewStore } from '../lib/store';

/**
 * Debounced search filter component for timeline events.
 * Filters events by name and description with configurable debounce delay.
 */
export function SearchFilter() {
  const setSearchText = useViewStore((state) => state.setSearchText);
  const [inputValue, setInputValue] = useState(() => useViewStore.getState().searchText);
  const pendingSearch = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // An external filter update takes precedence over an uncommitted draft.
    const unsubscribe = useViewStore.subscribe((state, previousState) => {
      if (state.searchText !== previousState.searchText) {
        if (pendingSearch.current !== null) {
          clearTimeout(pendingSearch.current);
          pendingSearch.current = null;
        }
        setInputValue(state.searchText);
      }
    });

    return () => {
      unsubscribe();
      if (pendingSearch.current !== null) {
        clearTimeout(pendingSearch.current);
      }
    };
  }, []);

  const handleChange = (value: string) => {
    setInputValue(value);
    if (pendingSearch.current !== null) {
      clearTimeout(pendingSearch.current);
    }
    pendingSearch.current = setTimeout(() => {
      pendingSearch.current = null;
      setSearchText(value);
    }, 300);
  };

  const handleClear = () => {
    if (pendingSearch.current !== null) {
      clearTimeout(pendingSearch.current);
      pendingSearch.current = null;
    }
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
          onChange={(e) => handleChange(e.target.value)}
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
