# TanStack Query Setup

This application uses [TanStack Query](https://tanstack.com/query/latest) (formerly React Query) for efficient data fetching, caching, and synchronization.

## Configuration

The QueryClient is configured with the following defaults:

- **Stale Time**: 5 minutes - Data is considered fresh for 5 minutes
- **GC Time**: 10 minutes - Unused cache entries are garbage collected after 10 minutes
- **Retry Logic**: 
  - Retries up to 3 times for network errors and 5xx server errors
  - Does not retry for 4xx client errors (401, 403, 404, etc.)
- **Refetch Behavior**:
  - Refetches on window focus
  - Refetches on network reconnection

## Usage

### Basic Query Example

```tsx
import { useQuery } from '@tanstack/react-query';
import { fetchTimelineEvents } from '../lib/api';

function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['timeline', 'events'],
    queryFn: fetchTimelineEvents,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Render data */}</div>;
}
```

### Override Default Options

You can override default options per-hook:

```tsx
const { data } = useQuery({
  queryKey: ['timeline', 'events'],
  queryFn: fetchTimelineEvents,
  staleTime: 10 * 60 * 1000, // Override to 10 minutes
  retry: 5, // Override to retry 5 times
});
```

### Accessing the Query Client

Use the `useQueryClient` hook to access the query client for cache manipulation:

```tsx
import { useQueryClient } from '../lib/useQueryClient';

function MyComponent() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['timeline'] });
  };

  return <button onClick={handleRefresh}>Refresh</button>;
}
```

## Testing

The query client provider is tested in `src/test/queryClient.test.tsx` with tests for:
- Provider renders children correctly
- QueryClient is accessible via useQueryClient hook
- Default options are configured correctly
- Retry logic works as expected

Run tests with:
```bash
npm test
```

## Files

- `src/lib/queryClient.ts` - QueryClient configuration and creation
- `src/lib/useQueryClient.ts` - Helper hook for accessing the query client
- `src/main.tsx` - App root with QueryClientProvider
- `src/test/queryClient.test.tsx` - Provider tests
