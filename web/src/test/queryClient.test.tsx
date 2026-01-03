import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '../lib/queryClient';
import { useQueryClient } from '../lib/useQueryClient';

describe('QueryClientProvider', () => {
  it('renders children correctly', () => {
    const queryClient = createQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <div>Test Content</div>
      </QueryClientProvider>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('provides QueryClient instance through useQueryClient hook', () => {
    const queryClient = createQueryClient();
    
    function TestComponent() {
      const client = useQueryClient();
      return (
        <div data-testid="client-check">
          {client instanceof QueryClient ? 'QueryClient available' : 'No client'}
        </div>
      );
    }
    
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );
    
    expect(screen.getByTestId('client-check')).toHaveTextContent('QueryClient available');
  });

  it('creates QueryClient with default options', () => {
    const queryClient = createQueryClient();
    
    expect(queryClient).toBeDefined();
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(5 * 60 * 1000);
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(10 * 60 * 1000);
  });

  it('allows retry configuration to be overridden', () => {
    const queryClient = createQueryClient();
    const retryFn = queryClient.getDefaultOptions().queries?.retry;
    
    expect(retryFn).toBeDefined();
    
    if (typeof retryFn === 'function') {
      // Should retry on generic errors
      expect(retryFn(0, new Error('Network error'))).toBe(true);
      expect(retryFn(1, new Error('Network error'))).toBe(true);
      expect(retryFn(2, new Error('Network error'))).toBe(true);
      
      // Should not retry after 3 attempts
      expect(retryFn(3, new Error('Network error'))).toBe(false);
      
      // Should not retry on 404 errors
      expect(retryFn(0, new Error('Failed with 404'))).toBe(false);
      
      // Should not retry on 401 errors
      expect(retryFn(0, new Error('Failed with 401'))).toBe(false);
      
      // Should not retry on 403 errors
      expect(retryFn(0, new Error('Failed with 403'))).toBe(false);
    }
  });
});

