import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineItemSkeleton, DetailSkeleton, MapSkeleton } from '../components/skeletons';

describe('Skeleton Components', () => {
  describe('TimelineItemSkeleton', () => {
    it('renders with correct accessibility attributes', () => {
      render(<TimelineItemSkeleton />);
      
      const skeleton = screen.getByTestId('timeline-item-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading timeline item');
    });

    it('renders multiple skeleton items independently', () => {
      const { container } = render(
        <>
          <TimelineItemSkeleton />
          <TimelineItemSkeleton />
          <TimelineItemSkeleton />
        </>
      );
      
      const skeletons = container.querySelectorAll('[data-testid="timeline-item-skeleton"]');
      expect(skeletons).toHaveLength(3);
    });
  });

  describe('DetailSkeleton', () => {
    it('renders with correct accessibility attributes', () => {
      render(<DetailSkeleton />);
      
      const skeleton = screen.getByTestId('detail-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading event details');
    });

    it('has expected structure with multiple fields', () => {
      const { container } = render(<DetailSkeleton />);
      
      // Should have multiple skeleton elements (name, time, description fields)
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });

  describe('MapSkeleton', () => {
    it('renders with correct accessibility attributes', () => {
      render(<MapSkeleton />);
      
      const skeleton = screen.getByTestId('map-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading map');
    });

    it('has overlay styling to cover map area', () => {
      render(<MapSkeleton />);
      
      const skeleton = screen.getByTestId('map-skeleton');
      // Should have absolute positioning to overlay the map
      expect(skeleton.className).toContain('absolute');
      expect(skeleton.className).toContain('inset-0');
    });
  });
});
