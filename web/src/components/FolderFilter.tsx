import { useState, useEffect } from 'react';
import { fetchFolders } from '../lib/api';
import { useViewStore } from '../lib/store';

export function FolderFilter() {
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedFolder, setSelectedFolder } = useViewStore();

  useEffect(() => {
    async function loadFolders() {
      try {
        setLoading(true);
        const data = await fetchFolders();
        setFolders(data.folders || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load folders');
      } finally {
        setLoading(false);
      }
    }

    loadFolders();
  }, []);

  const handleFolderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedFolder(value === '' ? null : value);
  };

  const handleClearFilter = () => {
    setSelectedFolder(null);
  };

  if (error) {
    return (
      <div className="text-sm text-red-600" role="alert">
        Failed to load folders
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="folder-filter" className="text-sm font-medium text-gray-700">
        Filter by folder:
      </label>
      <select
        id="folder-filter"
        value={selectedFolder || ''}
        onChange={handleFolderChange}
        disabled={loading}
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
          className="px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="Clear folder filter"
        >
          Clear
        </button>
      )}
      {selectedFolder && (
        <span className="text-sm text-gray-600">
          (filtering by: <strong>{selectedFolder}</strong>)
        </span>
      )}
    </div>
  );
}
