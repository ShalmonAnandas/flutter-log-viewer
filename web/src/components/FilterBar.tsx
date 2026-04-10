'use client';

type FilterType = 'all' | 'request' | 'response' | 'error' | 'lifecycle' | 'heartbeat' | 'debug' | 'webview' | 'validation';

interface Props {
  filter: string;
  setFilter: (f: FilterType) => void;
  search: string;
  setSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  sortBy: 'time' | 'status' | 'duration';
  setSortBy: (s: 'time' | 'status' | 'duration') => void;
  typeCounts: Record<string, number>;
  statusCodes: number[];
  expandAll: () => void;
  collapseAll: () => void;
  resultCount: number;
}

const filterConfig: { key: FilterType; label: string; icon: string; color: string }[] = [
  { key: 'all', label: 'All', icon: '📋', color: 'border-white/20 bg-white/5 text-white' },
  { key: 'request', label: 'Requests', icon: '📤', color: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  { key: 'response', label: 'Responses', icon: '📥', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  { key: 'error', label: 'Errors', icon: '❌', color: 'border-red-500/30 bg-red-500/10 text-red-400' },
  { key: 'lifecycle', label: 'Lifecycle', icon: '🔄', color: 'border-purple-500/30 bg-purple-500/10 text-purple-400' },
  { key: 'heartbeat', label: 'Heartbeat', icon: '💓', color: 'border-pink-500/30 bg-pink-500/10 text-pink-400' },
  { key: 'debug', label: 'Debug', icon: '🐛', color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' },
  { key: 'webview', label: 'WebView', icon: '🌐', color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' },
  { key: 'validation', label: 'Validation', icon: '✅', color: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
];

export default function FilterBar({
  filter,
  setFilter,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  typeCounts,
  statusCodes,
  expandAll,
  collapseAll,
  resultCount,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search URLs, bodies, errors, messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Code Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 focus:outline-none focus:border-blue-500/40 appearance-none cursor-pointer"
        >
          <option value="all">All Status</option>
          {statusCodes.sort((a, b) => a - b).map(code => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'time' | 'status' | 'duration')}
          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 focus:outline-none focus:border-blue-500/40 appearance-none cursor-pointer"
        >
          <option value="time">Sort: Order</option>
          <option value="status">Sort: Status</option>
          <option value="duration">Sort: Duration</option>
        </select>

        {/* Expand/Collapse */}
        <div className="flex gap-1">
          <button
            onClick={expandAll}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Expand all"
          >
            ↕ Expand
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Collapse all"
          >
            ↔ Collapse
          </button>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterConfig.map(f => {
          const count = typeCounts[f.key] || 0;
          if (f.key !== 'all' && count === 0) return null;
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                isActive
                  ? f.color + ' shadow-lg'
                  : 'border-white/5 bg-white/[0.02] text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                isActive ? 'bg-white/10' : 'bg-white/5'
              }`}>
                {f.key === 'all' ? typeCounts.all || 0 : count}
              </span>
            </button>
          );
        })}

        <div className="ml-auto text-xs text-gray-600">
          Showing {resultCount} entries
        </div>
      </div>
    </div>
  );
}
