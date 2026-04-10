'use client';

import { LogStats, LogEntry } from '@/lib/logParser';
import { useMemo } from 'react';

interface Props {
  stats: LogStats;
  entries: LogEntry[];
}

function StatCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color: string; icon: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${color} p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold mt-1 text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10 bg-slate-300"></div>
    </div>
  );
}

function StatusCodeBar({ code, count, total }: { code: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const color = code < 300 ? 'bg-emerald-500' : code < 400 ? 'bg-yellow-500' : code < 500 ? 'bg-orange-500' : 'bg-red-500';
  const label = code === 200 ? 'OK' : code === 401 ? 'Unauthorized' : code === 500 ? 'Server Error' : code === 8 ? 'Timeout/Failed' : `Status ${code}`;

  return (
    <div className="flex items-center gap-3">
      <div className="w-12 text-right">
        <span className={`text-sm font-mono font-bold ${code < 300 ? 'text-emerald-400' : code < 400 ? 'text-yellow-400' : code < 500 ? 'text-orange-400' : 'text-red-400'}`}>
          {code}
        </span>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-600">{label}</span>
          <span className="text-xs text-slate-500">{count} ({pct.toFixed(1)}%)</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    </div>
  );
}

function ResponseTimeChart({ times }: { times: { url: string; time: number; status: number }[] }) {
  if (times.length === 0) return null;
  const maxTime = Math.max(...times.map(t => t.time));

  return (
    <div className="space-y-1.5">
      {times.slice(0, 30).map((item, idx) => {
        const pct = maxTime > 0 ? (item.time / maxTime) * 100 : 0;
        const color = item.time < 1000 ? 'bg-emerald-500' : item.time < 3000 ? 'bg-yellow-500' : item.time < 10000 ? 'bg-orange-500' : 'bg-red-500';
        const endpoint = item.url.replace(/https?:\/\/[^/]+/, '').split('/').slice(-1)[0] || item.url;

        return (
          <div key={idx} className="group relative">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] w-7 text-center font-mono rounded px-1 ${item.status < 300 ? 'text-emerald-400' : 'text-red-400'}`}>
                {item.status}
              </span>
              <div className="flex-1 h-5 rounded bg-white/5 overflow-hidden relative">
                <div className={`h-full rounded ${color} opacity-80 transition-all duration-500`} style={{ width: `${Math.max(pct, 2)}%` }}></div>
                 <span className="absolute inset-0 flex items-center px-2 text-[10px] font-mono text-white truncate">
                  {endpoint}
                </span>
              </div>
               <span className="text-[10px] font-mono text-slate-500 w-16 text-right">
                {item.time >= 1000 ? `${(item.time / 1000).toFixed(1)}s` : `${item.time}ms`}
              </span>
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-10 mb-1 hidden group-hover:block z-10">
               <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-xl max-w-sm">
                 <p className="text-slate-700 break-all">{item.url}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EndpointTable({ endpoints }: { endpoints: Record<string, { count: number; avgTime: number; errors: number; times: number[] }> }) {
  const sorted = useMemo(() => {
    return Object.entries(endpoints)
      .map(([path, data]) => ({ path, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [endpoints]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-2 px-3 text-left text-slate-500 font-medium">Endpoint</th>
            <th className="py-2 px-3 text-right text-slate-500 font-medium">Calls</th>
            <th className="py-2 px-3 text-right text-slate-500 font-medium">Avg Time</th>
            <th className="py-2 px-3 text-right text-slate-500 font-medium">Errors</th>
            <th className="py-2 px-3 text-right text-slate-500 font-medium">Performance</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((ep, idx) => {
            const healthColor = ep.errors > 0 ? 'text-red-400' : ep.avgTime > 5000 ? 'text-orange-400' : ep.avgTime > 2000 ? 'text-yellow-400' : 'text-emerald-400';
            const healthIcon = ep.errors > 0 ? '⚠️' : ep.avgTime > 5000 ? '🔴' : ep.avgTime > 2000 ? '🟡' : '🟢';
            return (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-3">
                  <span className="font-mono text-blue-400 break-all">{ep.path.split('/').slice(-2).join('/')}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5 break-all">{ep.path}</span>
                </td>
                <td className="py-2.5 px-3 text-right text-slate-900 font-medium">{ep.count}</td>
                <td className="py-2.5 px-3 text-right">
                  <span className={healthColor}>
                    {ep.avgTime >= 1000 ? `${(ep.avgTime / 1000).toFixed(1)}s` : `${ep.avgTime}ms`}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  {ep.errors > 0 ? (
                    <span className="text-red-400 font-medium">{ep.errors}</span>
                  ) : (
                    <span className="text-slate-500">0</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span title={`${ep.avgTime}ms avg, ${ep.errors} errors`}>{healthIcon}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LifecycleTimeline({ events }: { events: { state: string; index: number }[] }) {
  const stateColors: Record<string, string> = {
    'AppLifecycleState.resumed': 'bg-emerald-500',
    'AppLifecycleState.inactive': 'bg-yellow-500',
    'AppLifecycleState.paused': 'bg-orange-500',
    'AppLifecycleState.hidden': 'bg-gray-500',
    'AppLifecycleState.detached': 'bg-red-500',
  };

  const stateLabels: Record<string, string> = {
    'AppLifecycleState.resumed': 'Resumed',
    'AppLifecycleState.inactive': 'Inactive',
    'AppLifecycleState.paused': 'Paused',
    'AppLifecycleState.hidden': 'Hidden',
    'AppLifecycleState.detached': 'Detached',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {events.map((evt, idx) => (
        <div
          key={idx}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200"
        >
          <div className={`w-2 h-2 rounded-full ${stateColors[evt.state] || 'bg-gray-500'}`}></div>
          <span className="text-[10px] text-slate-600">{stateLabels[evt.state] || evt.state}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ stats, entries }: Props) {
  const requestEntries = useMemo(() => entries.filter(e => e.type === 'request'), [entries]);
  const errorEntries = useMemo(() => entries.filter(e => e.type === 'error'), [entries]);
  const totalStatusResponses = Object.values(stats.statusCodes).reduce((a, b) => a + b, 0);

  // Calculate success rate
  const successCount = stats.statusCodes[200] || 0;
  const successRate = totalStatusResponses > 0 ? Math.round((successCount / totalStatusResponses) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard label="Total Requests" value={stats.totalRequests} icon="📤" color="border-blue-200 bg-blue-50" />
        <StatCard label="Total Responses" value={stats.totalResponses} icon="📥" color="border-emerald-200 bg-emerald-50" />
        <StatCard label="Errors" value={stats.totalErrors} icon="❌" color="border-red-200 bg-red-50" sub={`${stats.errorRate}% error rate`} />
        <StatCard label="Success Rate" value={`${successRate}%`} icon="✅" color="border-emerald-200 bg-emerald-50" />
        <StatCard label="Avg Response" value={stats.avgResponseTime >= 1000 ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` : `${stats.avgResponseTime}ms`} icon="⚡" color="border-amber-200 bg-amber-50" sub={`Max: ${(stats.maxResponseTime / 1000).toFixed(1)}s`} />
        <StatCard label="Unique Endpoints" value={Object.keys(stats.endpoints).length} icon="🔗" color="border-violet-200 bg-violet-50" sub={`${requestEntries.length} total calls`} />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Code Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-blue-500"></span>
            HTTP Status Codes
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.statusCodes)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([code, count]) => (
                <StatusCodeBar key={code} code={Number(code)} count={count} total={totalStatusResponses} />
              ))}
          </div>
        </div>

        {/* Response Time Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-yellow-500"></span>
            Response Times
          </h3>
          <ResponseTimeChart times={stats.responseTimes} />
        </div>
      </div>

      {/* Lifecycle */}
      {stats.lifecycleEvents.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-purple-500"></span>
            App Lifecycle Events
            <span className="text-xs text-slate-500">({stats.lifecycleEvents.length} transitions)</span>
          </h3>
          <LifecycleTimeline events={stats.lifecycleEvents} />
        </div>
      )}

      {/* Endpoint Performance */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-emerald-500"></span>
          Endpoint Performance
          <span className="text-xs text-slate-500">({Object.keys(stats.endpoints).length} endpoints)</span>
        </h3>
        <EndpointTable endpoints={stats.endpoints} />
      </div>

      {/* Errors Section */}
      {errorEntries.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <h3 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-red-500"></span>
            Errors & Exceptions ({errorEntries.length})
          </h3>
          <div className="space-y-3">
            {errorEntries.map((err) => (
              <div key={err.id} className="rounded-xl bg-white border border-red-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                      Status {err.statusCode}
                    </span>
                    {err.responseTime && (
                      <span className="text-xs text-slate-500 ml-2">{err.responseTime}ms</span>
                    )}
                  </div>
                </div>
                {err.url && (
                  <p className="text-xs font-mono text-slate-600 mt-2 break-all">{err.url}</p>
                )}
                {err.errorType && (
                  <p className="text-xs text-orange-400 mt-1">{err.errorType}</p>
                )}
                {err.errorMessage && (
                   <pre className="text-xs text-slate-600 mt-2 whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-3">
                    {err.errorMessage}
                  </pre>
                )}
                {err.body && (
                   <pre className="text-xs text-slate-600 mt-2 whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-3 max-h-40 overflow-auto">
                    {err.body}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Range */}
      {stats.timeRange.start && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-cyan-500"></span>
            Session Time Range
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Start:</span>
              <span className="font-mono text-cyan-400">{stats.timeRange.start}</span>
            </div>
            <div className="text-slate-500">→</div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">End:</span>
              <span className="font-mono text-cyan-400">{stats.timeRange.end}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
