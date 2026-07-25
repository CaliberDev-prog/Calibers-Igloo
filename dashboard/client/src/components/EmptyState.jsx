export default function EmptyState({ icon: Icon, title, description, action, actionLabel, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <div className="w-20 h-20 rounded-2xl bg-dark-800/40 border border-dark-700/30 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-dark-600" />
      </div>
      <h3 className="text-lg font-semibold text-dark-300 mb-2">{title}</h3>
      <p className="text-sm text-dark-500 max-w-sm text-center mb-6">{description}</p>
      {action && (
        <button onClick={action} className="btn-primary text-sm">
          {actionLabel || 'Get Started'}
        </button>
      )}
    </div>
  );
}
