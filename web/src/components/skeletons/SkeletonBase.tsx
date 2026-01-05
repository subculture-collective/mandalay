interface SkeletonBaseProps {
  className?: string;
  'data-testid'?: string;
}

/**
 * Base skeleton component with pulsing animation
 * Used as a building block for more complex skeleton layouts
 */
export function SkeletonBase({ className = '', 'data-testid': testId }: SkeletonBaseProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      data-testid={testId}
      aria-hidden="true"
    />
  );
}
