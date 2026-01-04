import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterResetButton } from '../components/FilterResetButton';
import { useViewStore } from '../lib/store';

describe('FilterResetButton', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useViewStore.setState({
      selectedFolder: null,
      searchText: '',
      timeRangeStart: null,
      timeRangeEnd: null,
      includeNullTimestamps: true,
    });
  });

  it('renders reset button', () => {
    render(<FilterResetButton />);
    expect(screen.getByRole('button', { name: /reset all filters/i })).toBeInTheDocument();
  });

  it('is disabled when no filters are active', () => {
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('cursor-not-allowed');
  });

  it('is enabled when folder filter is active', () => {
    useViewStore.setState({ selectedFolder: 'Test Folder' });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    expect(button).not.toBeDisabled();
  });

  it('is enabled when search text filter is active', () => {
    useViewStore.setState({ searchText: 'test search' });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    expect(button).not.toBeDisabled();
  });

  it('is enabled when time range start filter is active', () => {
    useViewStore.setState({ timeRangeStart: '2017-10-01T20:00' });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    expect(button).not.toBeDisabled();
  });

  it('is enabled when time range end filter is active', () => {
    useViewStore.setState({ timeRangeEnd: '2017-10-01T22:00' });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    expect(button).not.toBeDisabled();
  });

  it('is enabled when multiple filters are active', () => {
    useViewStore.setState({
      selectedFolder: 'Test Folder',
      searchText: 'test search',
      timeRangeStart: '2017-10-01T20:00',
      timeRangeEnd: '2017-10-01T22:00',
    });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    expect(button).not.toBeDisabled();
  });

  it('clears folder filter when clicked', () => {
    useViewStore.setState({ selectedFolder: 'Test Folder' });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    
    fireEvent.click(button);
    
    expect(useViewStore.getState().selectedFolder).toBeNull();
  });

  it('clears search text filter when clicked', () => {
    useViewStore.setState({ searchText: 'test search' });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    
    fireEvent.click(button);
    
    expect(useViewStore.getState().searchText).toBe('');
  });

  it('clears time range filters when clicked', () => {
    useViewStore.setState({
      timeRangeStart: '2017-10-01T20:00',
      timeRangeEnd: '2017-10-01T22:00',
    });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    
    fireEvent.click(button);
    
    expect(useViewStore.getState().timeRangeStart).toBeNull();
    expect(useViewStore.getState().timeRangeEnd).toBeNull();
  });

  it('resets includeNullTimestamps to default when clicked', () => {
    useViewStore.setState({
      timeRangeStart: '2017-10-01T20:00',
      includeNullTimestamps: false,
    });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    
    fireEvent.click(button);
    
    expect(useViewStore.getState().includeNullTimestamps).toBe(true);
  });

  it('clears all filters simultaneously when clicked', () => {
    useViewStore.setState({
      selectedFolder: 'Test Folder',
      searchText: 'test search',
      timeRangeStart: '2017-10-01T20:00',
      timeRangeEnd: '2017-10-01T22:00',
      includeNullTimestamps: false,
    });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    
    fireEvent.click(button);
    
    const state = useViewStore.getState();
    expect(state.selectedFolder).toBeNull();
    expect(state.searchText).toBe('');
    expect(state.timeRangeStart).toBeNull();
    expect(state.timeRangeEnd).toBeNull();
    expect(state.includeNullTimestamps).toBe(true);
  });

  it('becomes disabled after clearing filters', () => {
    useViewStore.setState({ selectedFolder: 'Test Folder' });
    const { rerender } = render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    rerender(<FilterResetButton />);
    
    expect(button).toBeDisabled();
  });

  it('ignores whitespace-only search text', () => {
    useViewStore.setState({ searchText: '   ' });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    expect(button).toBeDisabled();
  });

  it('displays correct styling when enabled', () => {
    useViewStore.setState({ selectedFolder: 'Test Folder' });
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    expect(button).toHaveClass('bg-blue-600');
    expect(button).not.toHaveClass('bg-gray-100');
  });

  it('displays correct styling when disabled', () => {
    render(<FilterResetButton />);
    const button = screen.getByRole('button', { name: /reset all filters/i });
    expect(button).toHaveClass('bg-gray-100');
    expect(button).not.toHaveClass('bg-blue-600');
  });
});
