import { useFolders } from '../lib/useFolders';
import { useViewStore } from '../lib/store';

export function FolderFilter() {
  const { data, isLoading, isError } = useFolders();
  const { selectedFolder, setSelectedFolder } = useViewStore();

  const handleFolderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedFolder(value === '' ? null : value);
  };

  const handleClearFilter = () => {
    setSelectedFolder(null);
  };

  if (isError) {
    return (
      <div className="text-sm text-red-600" role="alert">
        Failed to load folders
      </div>
    );
  }

  const folders = data?.folders || [];

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="folder-filter" className="text-sm font-medium text-gray-700">
        Filter by folder:
      </label>
      <select
        id="folder-filter"
        value={selectedFolder || ''}
        onChange={handleFolderChange}
        disabled={isLoading}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">All folders</option>
        {folders.map((folder) => (
          <option key={folder} value={folder}>
            {folder}
          </option>
        ))}
      </select>
      {selectedFolder && (
        <button
          onClick={handleClearFilter}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="Clear folder filter"
        >
          <span className="text-gray-600">Filtering:</span>
          <strong>{selectedFolder}</strong>
          <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
