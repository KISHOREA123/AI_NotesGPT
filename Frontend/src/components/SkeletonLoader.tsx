import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect' | 'card';
}

export function SkeletonLoader({ className, variant = 'rect' }: SkeletonLoaderProps) {
  const variants = {
    text: 'h-4 w-3/4 rounded',
    circle: 'h-10 w-10 rounded-full',
    rect: 'h-20 w-full rounded-lg',
    card: 'h-40 w-full rounded-xl',
  };

  return (
    <div className={cn('animate-shimmer', variants[variant], className)} />
  );
}

export function NoteCardSkeleton() {
  return (
    <div className="note-card bg-card animate-pulse">
      <div className="h-5 w-3/4 bg-muted rounded mb-3" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
        <div className="h-3 w-2/3 bg-muted rounded" />
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="h-6 w-6 bg-muted rounded-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded" />
      </div>
      
      {/* Recent notes skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <NoteCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
