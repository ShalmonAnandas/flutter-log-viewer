'use client';

import { LogEntry, LogStats } from '@/lib/logParser';
import { useMemo, useState } from 'react';

interface Props {
  entries: LogEntry[];
  stats: LogStats;
}

function formatDuration(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function statusTone(statusCode?: number) {
  if (statusCode === undefined) return 'bg-slate-100 text-slate-600';
  if (statusCode < 300) return 'bg-emerald-50 text-emerald-700';
  if (statusCode < 400) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}

export default function TimelineView({ entries, stats }: Props) {
  const [showOnlyNetwork, setShowOnlyNetwork] = useState(true);

  const timelineEntries = useMemo(() => {
    const list = showOnlyNetwork
      ? entries.filter(e => e.type === 'request' || e.type === 'response' || e.type === 'error')
      : entries;
    return list.slice().sort((a, b) => a.lineStart - b.lineStart);
  }, [entries, showOnlyNetwork]);

  const responseEntries = useMemo(
    () => timelineEntries.filter(e => (e.type === 'response' || e.type === 'error') && e.responseTime !== undefined),
    [timelineEntries]
  );

  const maxTime = Math.max(stats.maxResponseTime || 0, 1);

  const activityByMinute = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const entry of timelineEntries) {
      const ts = entry.timestamp || entry.extras?.startTime;
      if (!ts || ts.length < 16) continue;
      const minute = ts.substring(0, 16);
      buckets.set(minute, (buckets.get(minute) || 0) + 1);
    }
    return Array.from(buckets.entries()).map(([minute, count]) => ({ minute, count }));
  }, [timelineEntries]);

  const maxBucket = Math.max(...activityByMinute.map(b => b.count), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Timeline</h2>
          <p className="text-xs text-slate-500">Cleaner chronological view of log activity and latency.</p>
        </div>
        <button
          onClick={() => setShowOnlyNetwork(!showOnlyNetwork)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {showOnlyNetwork ? 'Showing network only' : 'Showing all events'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Chronological events</h3>
          <span className="text-xs text-slate-500">{timelineEntries.length} items</span>
        </div>
        <div className="max-h-[520px] overflow-auto pr-1">
          <div className="space-y-2">
            {timelineEntries.map((entry, index) => (
              <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500">#{index + 1}</span>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                    {entry.method || entry.type}
                  </span>
                  {entry.statusCode !== undefined && (
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusTone(entry.statusCode)}`}>
                      {entry.statusCode}
                    </span>
                  )}
                  {entry.responseTime !== undefined && (
                    <span className="text-[11px] font-mono text-slate-600">{formatDuration(entry.responseTime)}</span>
                  )}
                  <span className="ml-auto text-[10px] font-mono text-slate-500">{entry.timestamp || 'no timestamp'}</span>
                </div>
                {(entry.url || entry.body) && (
                  <p className="mt-1 truncate text-xs text-slate-700">
                    {entry.url?.replace(/https?:\/\/[^/]+/, '') || entry.body?.replace(/\s+/g, ' ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Response latency</h3>
          <span className="text-xs text-slate-500">{responseEntries.length} responses/errors</span>
        </div>
        <div className="space-y-2">
          {responseEntries.map((entry) => {
            const width = Math.max(((entry.responseTime || 0) / maxTime) * 100, 1);
            return (
              <div key={entry.id} className="grid grid-cols-[70px_1fr_70px] items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">{entry.statusCode ?? '--'}</span>
                <div className="h-5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${entry.type === 'error' ? 'bg-rose-400' : 'bg-blue-400'}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-right text-[10px] font-mono text-slate-600">{formatDuration(entry.responseTime || 0)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {activityByMinute.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Activity by minute</h3>
          <div className="space-y-2">
            {activityByMinute.map((bucket) => (
              <div key={bucket.minute} className="grid grid-cols-[130px_1fr_50px] items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">{bucket.minute}</span>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-400" style={{ width: `${(bucket.count / maxBucket) * 100}%` }} />
                </div>
                <span className="text-right text-[10px] text-slate-600">{bucket.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
