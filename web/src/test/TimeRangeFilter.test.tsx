import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeRangeFilter } from '../components/TimeRangeFilter';
import { useViewStore } from '../lib/store';

describe('TimeRangeFilter', () => {
  beforeEach(() => {
    // Reset store state before each test
    useViewStore.setState({
      timeRangeStart: null,
      timeRangeEnd: null,
      includeNullTimestamps: true,
    });
  });

  it('renders datetime inputs for start and end time', () => {
    render(<TimeRangeFilter />);
    
    expect(screen.getByLabelText(/from:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to:/i)).toBeInTheDocument();
  });

  it('does not show clear button when no filter is set', () => {
    render(<TimeRangeFilter />);
    
    expect(screen.queryByRole('button', { name: /clear time range filter/i })).not.toBeInTheDocument();
  });

  it('shows clear button when start time is set', () => {
    useViewStore.setState({ timeRangeStart: '2017-10-01T21:00:00' });
    
    render(<TimeRangeFilter />);
    
    expect(screen.getByRole('button', { name: /clear time range filter/i })).toBeInTheDocument();
  });

  it('shows clear button when end time is set', () => {
    useViewStore.setState({ timeRangeEnd: '2017-10-01T22:00:00' });
    
    render(<TimeRangeFilter />);
    
    expect(screen.getByRole('button', { name: /clear time range filter/i })).toBeInTheDocument();
  });

  it('updates store when start time is changed', () => {
    render(<TimeRangeFilter />);
    
    const startInput = screen.getByLabelText(/from:/i);
    fireEvent.change(startInput, { target: { value: '2017-10-01T21:00:00' } });
    
    const state = useViewStore.getState();
    expect(state.timeRangeStart).toBe('2017-10-01T21:00');
  });

  it('updates store when end time is changed', () => {
    render(<TimeRangeFilter />);
    
    const endInput = screen.getByLabelText(/to:/i);
    fireEvent.change(endInput, { target: { value: '2017-10-01T22:00:00' } });
    
    const state = useViewStore.getState();
    expect(state.timeRangeEnd).toBe('2017-10-01T22:00');
  });

  it('clears both start and end time when clear button is clicked', () => {
    useViewStore.setState({
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
    });
    
    render(<TimeRangeFilter />);
    
    const clearButton = screen.getByRole('button', { name: /clear time range filter/i });
    fireEvent.click(clearButton);
    
    const state = useViewStore.getState();
    expect(state.timeRangeStart).toBeNull();
    expect(state.timeRangeEnd).toBeNull();
  });

  it('displays start time value from store', () => {
    useViewStore.setState({ timeRangeStart: '2017-10-01T21:00:00' });
    
    render(<TimeRangeFilter />);
    
    const startInput = screen.getByLabelText(/from:/i) as HTMLInputElement;
    expect(startInput.value).toBe('2017-10-01T21:00');
  });

  it('displays end time value from store', () => {
    useViewStore.setState({ timeRangeEnd: '2017-10-01T22:00:00' });
    
    render(<TimeRangeFilter />);
    
    const endInput = screen.getByLabelText(/to:/i) as HTMLInputElement;
    expect(endInput.value).toBe('2017-10-01T22:00');
  });

  it('does not show null timestamp checkbox when no filter is active', () => {
    render(<TimeRangeFilter />);
    
    expect(screen.queryByLabelText(/include events without timestamps/i)).not.toBeInTheDocument();
  });

  it('shows null timestamp checkbox when filter is active', () => {
    useViewStore.setState({ timeRangeStart: '2017-10-01T21:00:00' });
    
    render(<TimeRangeFilter />);
    
    expect(screen.getByLabelText(/include events without timestamps/i)).toBeInTheDocument();
  });

  it('checkbox is checked by default when filter is active', () => {
    useViewStore.setState({
      timeRangeStart: '2017-10-01T21:00:00',
      includeNullTimestamps: true,
    });
    
    render(<TimeRangeFilter />);
    
    const checkbox = screen.getByLabelText(/include events without timestamps/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('toggles includeNullTimestamps when checkbox is clicked', () => {
    useViewStore.setState({
      timeRangeStart: '2017-10-01T21:00:00',
      includeNullTimestamps: true,
    });
    
    render(<TimeRangeFilter />);
    
    const checkbox = screen.getByLabelText(/include events without timestamps/i);
    fireEvent.click(checkbox);
    
    const state = useViewStore.getState();
    expect(state.includeNullTimestamps).toBe(false);
  });

  it('reflects store changes to includeNullTimestamps', () => {
    useViewStore.setState({
      timeRangeStart: '2017-10-01T21:00:00',
      includeNullTimestamps: false,
    });
    
    render(<TimeRangeFilter />);
    
    const checkbox = screen.getByLabelText(/include events without timestamps/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('handles empty input values correctly', () => {
    useViewStore.setState({ timeRangeStart: '2017-10-01T21:00:00' });
    
    render(<TimeRangeFilter />);
    
    const startInput = screen.getByLabelText(/from:/i);
    fireEvent.change(startInput, { target: { value: '' } });
    
    const state = useViewStore.getState();
    expect(state.timeRangeStart).toBeNull();
  });

  it('preserves end time when start time is cleared', () => {
    useViewStore.setState({
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
    });
    
    render(<TimeRangeFilter />);
    
    const startInput = screen.getByLabelText(/from:/i);
    fireEvent.change(startInput, { target: { value: '' } });
    
    const state = useViewStore.getState();
    expect(state.timeRangeStart).toBeNull();
    expect(state.timeRangeEnd).toBe('2017-10-01T22:00:00');
  });

  it('preserves start time when end time is cleared', () => {
    useViewStore.setState({
      timeRangeStart: '2017-10-01T21:00:00',
      timeRangeEnd: '2017-10-01T22:00:00',
    });
    
    render(<TimeRangeFilter />);
    
    const endInput = screen.getByLabelText(/to:/i);
    fireEvent.change(endInput, { target: { value: '' } });
    
    const state = useViewStore.getState();
    expect(state.timeRangeStart).toBe('2017-10-01T21:00:00');
    expect(state.timeRangeEnd).toBeNull();
  });
});
