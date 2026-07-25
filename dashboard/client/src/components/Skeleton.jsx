export function Skeleton({ className = '', count = 1, height = 'h-4', rounded = 'rounded-lg' }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} ${rounded} skeleton-shimmer`}
          style={{ animationDelay: `${i * 100}ms`, width: `${85 + Math.random() * 15}%` }}
        />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
        <div className="w-12 h-3 rounded-full skeleton-shimmer" />
      </div>
      <div className="w-16 h-8 rounded-lg skeleton-shimmer" />
      <div className="w-24 h-3 rounded-full skeleton-shimmer" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-4 rounded-lg skeleton-shimmer" style={{ width: `${20 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass p-6 space-y-4">
      <div className="w-32 h-4 rounded-full skeleton-shimmer" />
      <div className="space-y-2.5">
        <div className="w-full h-3 rounded-full skeleton-shimmer" />
        <div className="w-4/5 h-3 rounded-full skeleton-shimmer" />
        <div className="w-3/5 h-3 rounded-full skeleton-shimmer" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2.5">
          <div className="w-48 h-7 rounded-lg skeleton-shimmer" />
          <div className="w-64 h-4 rounded-full skeleton-shimmer" />
        </div>
        <div className="w-24 h-9 rounded-xl skeleton-shimmer" />
      </div>
      <div className="glass p-4">
        <div className="flex gap-3">
          <div className="flex-1 h-10 rounded-xl skeleton-shimmer" />
          <div className="w-32 h-10 rounded-xl skeleton-shimmer" />
        </div>
      </div>
      <div className="glass p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRowSkeleton key={i} cols={5} />
        ))}
      </div>
    </div>
  );
}
