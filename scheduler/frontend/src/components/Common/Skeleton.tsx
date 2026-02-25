/**
 * Skeleton — shimmer loading placeholder
 */

interface SkeletonProps {
  className?: string;
  rows?: number;
}

export function Skeleton({ className = 'h-4 w-full', rows = 1 }: SkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`rounded-lg bg-gradient-to-r from-surface-100 via-surface-200 to-surface-100 bg-[length:200%_100%] animate-shimmer ${className}`}
        />
      ))}
    </div>
  );
}
