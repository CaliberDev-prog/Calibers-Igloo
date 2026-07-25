import { RefreshCw } from 'lucide-react';

export default function PageHeader({ title, subtitle, action, actionLabel, onRefresh, refreshing, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <div className="page-header !mb-0">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button onClick={onRefresh} className="btn-ghost btn-sm">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {action && (
            <button onClick={action} className="btn-primary">
              {actionLabel}
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
