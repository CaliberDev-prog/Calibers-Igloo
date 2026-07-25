export default function StatCard({ icon: Icon, label, value, color = 'ice-300', trend, trendLabel, delay = 0, miniChart }) {
  const colorMap = {
    'ice-300': { bg: 'bg-ice-300/10', text: 'text-ice-300', ring: 'ring-ice-300/10' },
    'blue-400': { bg: 'bg-blue-400/10', text: 'text-blue-400', ring: 'ring-blue-400/10' },
    'green-400': { bg: 'bg-green-400/10', text: 'text-green-400', ring: 'ring-green-400/10' },
    'red-400': { bg: 'bg-red-400/10', text: 'text-red-400', ring: 'ring-red-400/10' },
    'purple-400': { bg: 'bg-purple-400/10', text: 'text-purple-400', ring: 'ring-purple-400/10' },
    'yellow-400': { bg: 'bg-yellow-400/10', text: 'text-yellow-400', ring: 'ring-yellow-400/10' },
    'orange-400': { bg: 'bg-orange-400/10', text: 'text-orange-400', ring: 'ring-orange-400/10' },
    'dark-400': { bg: 'bg-dark-400/10', text: 'text-dark-400', ring: 'ring-dark-400/10' },
  };

  const c = colorMap[color] || colorMap['ice-300'];

  return (
    <div
      className="stat-card animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center`}>
          <Icon className={`w-[18px] h-[18px] ${c.text}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              {trend >= 0 ? (
                <path d="M6 2L10 7H2L6 2Z" fill="currentColor" />
              ) : (
                <path d="M6 10L2 5H10L6 10Z" fill="currentColor" />
              )}
            </svg>
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-dark-100 tracking-tight">{value}</p>
      <p className="text-xs text-dark-500 mt-0.5">{label}</p>
      {miniChart && (
        <div className="mt-3 h-8 flex items-end gap-0.5">
          {miniChart.map((v, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${c.bg} transition-all duration-300`}
              style={{ height: `${Math.max(8, (v / Math.max(...miniChart)) * 100)}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
