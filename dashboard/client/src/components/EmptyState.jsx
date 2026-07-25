export default function EmptyState({ icon: Icon, title, description, action, actionLabel, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-dark-800/40 border border-dark-700/20 flex items-center justify-center">
          <Icon className="w-9 h-9 text-dark-600" />
        </div>
        <div className="absolute -inset-4 bg-ice-300/5 rounded-full blur-xl" />
      </div>
      <h3 className="text-base font-semibold text-dark-300 mb-1.5">{title}</h3>
      <p className="text-sm text-dark-500 max-w-xs text-center mb-6 leading-relaxed">{description}</p>
      {action && (
        <button onClick={action} className="btn-primary text-sm">
          {actionLabel || 'Get Started'}
        </button>
      )}
    </div>
  );
}
