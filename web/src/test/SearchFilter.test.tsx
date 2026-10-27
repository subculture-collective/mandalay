import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SearchFilter } from '../components/SearchFilter';
import { useViewStore } from '../lib/store';

describe('SearchFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useViewStore.setState({ searchText: '' });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('debounces typing and commits only the latest draft', () => {
    render(<SearchFilter />);
    const input = screen.getByRole('textbox', { name: 'Search events' });

    fireEvent.change(input, { target: { value: 'first' } });
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.change(input, { target: { value: 'latest' } });
    act(() => { vi.advanceTimersByTime(299); });

    expect(input).toHaveValue('latest');
    expect(useViewStore.getState().searchText).toBe('');

    act(() => { vi.advanceTimersByTime(1); });
    expect(useViewStore.getState().searchText).toBe('latest');
  });

  it('initializes from the store and follows external search changes', () => {
    useViewStore.getState().setSearchText('initial');
    render(<SearchFilter />);
    const input = screen.getByRole('textbox', { name: 'Search events' });
    expect(input).toHaveValue('initial');

    act(() => { useViewStore.getState().setSearchText('external'); });
    expect(input).toHaveValue('external');
  });

  it('cancels a pending draft when the store changes externally', () => {
    render(<SearchFilter />);
    const input = screen.getByRole('textbox', { name: 'Search events' });
    fireEvent.change(input, { target: { value: 'draft' } });

    act(() => { useViewStore.getState().setSearchText('external'); });
    expect(input).toHaveValue('external');

    act(() => { vi.advanceTimersByTime(300); });
    expect(useViewStore.getState().searchText).toBe('external');
  });

  it('clears immediately and cancels the pending draft', () => {
    useViewStore.getState().setSearchText('initial');
    render(<SearchFilter />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search events' }), {
      target: { value: 'draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByRole('textbox', { name: 'Search events' })).toHaveValue('');
    expect(useViewStore.getState().searchText).toBe('');

    act(() => { vi.advanceTimersByTime(300); });
    expect(useViewStore.getState().searchText).toBe('');
  });

  it('cancels a pending draft when unmounted', () => {
    const { unmount } = render(<SearchFilter />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search events' }), {
      target: { value: 'draft' },
    });
    unmount();

    act(() => { vi.advanceTimersByTime(300); });
    expect(useViewStore.getState().searchText).toBe('');
  });
});
