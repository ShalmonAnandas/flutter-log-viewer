'use client';

import { LogEntry, LogStats } from '@/lib/logParser';
import { useMemo, useState } from 'react';

interface Props {
  entries: LogEntry[];
  stats: LogStats;
}

function WaterfallBar({ entry, maxTime, index }: { entry: LogEntry; maxTime: number; index: number }) {
  const time = entry.responseTime || 0;
  const pct = maxTime > 0 ? (time / maxTime) * 100 : 0;

  const getColor = () => {
    if (entry.type === 'error') return 'bg-red-500';
    if (entry.statusCode && entry.statusCode >= 500) return 'bg-red-500';
    if (entry.statusCode && entry.statusCode >= 400) return 'bg-orange-500';
    if (time > 10000) return 'bg-red-400';
    if (time > 5000) return 'bg-orange-400';
    if (time > 2000) return 'bg-yellow-400';
    return 'bg-emerald-400';
  };

  const endpoint = entry.url?.replace(/https?:\/\/[^/]+/, '').split('/').pop() || '';

  return (
    <div className="flex items-center gap-2 group hover:bg-white/[0.02] px-3 py-1 rounded-lg transition-colors">
      <span className="text-[10px] text-gray-600 w-6 text-right font-mono">{index + 1}</span>

      <span className={`text-[10px] w-10 text-center font-mono rounded px-1 py-0.5 ${
        entry.type === 'request' ? 'text-blue-400 bg-blue-500/10' :
        entry.type === 'error' ? 'text-red-400 bg-red-500/10' :
        'text-emerald-400 bg-emerald-500/10'
      }`}>
        {entry.method || entry.type.toUpperCase().slice(0, 4)}
      </span>

      {entry.statusCode !== undefined && (
        <span className={`text-[10px] w-8 text-center font-mono ${
          entry.statusCode < 300 ? 'text-emerald-400' :
          entry.statusCode < 400 ? 'text-yellow-400' :
          'text-red-400'
        }`}>
          {entry.statusCode}
        </span>
      )}
      {entry.statusCode === undefined && <span className="w-8" />}

      <div className="flex-1 h-4 rounded bg-white/[0.03] overflow-hidden relative">
        <div
          className={`h-full rounded ${getColor()} opacity-70 transition-all duration-500`}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
        <span className="absolute inset-0 flex items-center px-2 text-[9px] font-mono text-white/60 truncate">
          {endpoint}
        </span>
      </div>

      <span className="text-[10px] font-mono text-gray-500 w-14 text-right">
        {time >= 1000 ? `${(time / 1000).toFixed(1)}s` : `${time}ms`}
      </span>

      {/* Tooltip */}
      <div className="absolute left-20 -top-8 hidden group-hover:block z-10 pointer-events-none">
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-[10px] shadow-xl whitespace-nowrap">
          <span className="text-gray-400 break-all">{entry.url}</span>
        </div>
      </div>
    </div>
  );
}

export default function TimelineView({ entries, stats }: Props) {
  const [showOnlyNetwork, setShowOnlyNetwork] = useState(true);

  const networkEntries = useMemo(() => {
    if (showOnlyNetwork) {
      return entries.filter(e => e.type === 'request' || e.type === 'response' || e.type === 'error');
    }
    return entries;
  }, [entries, showOnlyNetwork]);

  const responsesAndErrors = useMemo(() => {
    return entries.filter(e => (e.type === 'response' || e.type === 'error') && e.responseTime !== undefined);
  }, [entries]);

  const maxTime = stats.maxResponseTime || 1;

  // Group entries by timestamp proximity for request-response pairing
  const pairs = useMemo(() => {
    const result: { request?: LogEntry; response?: LogEntry; error?: LogEntry }[] = [];
    const requests = entries.filter(e => e.type === 'request');

    for (const req of requests) {
      // Find the closest response with matching URL
      const matchingResponses = entries.filter(e =>
        (e.type === 'response' || e.type === 'error') &&
        e.url === req.url &&
        e.lineStart > req.lineStart &&
        e.lineStart < req.lineStart + 500
      );

      if (matchingResponses.length > 0) {
        const res = matchingResponses[0];
        result.push({
          request: req,
          response: res.type === 'response' ? res : undefined,
          error: res.type === 'error' ? res : undefined,
        });
      } else {
        result.push({ request: req });
      }
    }

    return result;
  }, [entries]);

  // Build timeline segments from request extras timestamps
  const timeSegments = useMemo(() => {
    const segments: { time: string; entries: LogEntry[] }[] = [];
    let currentTime = '';
    let currentEntries: LogEntry[] = [];

    for (const entry of entries) {
      const ts = entry.timestamp || entry.extras?.startTime;
      if (ts) {
        const minute = ts.substring(0, 16); // YYYY-MM-DD HH:MM
        if (minute !== currentTime) {
          if (currentEntries.length > 0) {
            segments.push({ time: currentTime, entries: currentEntries });
          }
          currentTime = minute;
          currentEntries = [entry];
        } else {
          currentEntries.push(entry);
        }
      } else {
        currentEntries.push(entry);
      }
    }
    if (currentEntries.length > 0) {
      segments.push({ time: currentTime || 'Unknown', entries: currentEntries });
    }
    return segments;
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowOnlyNetwork(!showOnlyNetwork)}
          className={`px-4 py-2 rounded-xl text-sm border transition-all ${
            showOnlyNetwork
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-white/5 border-white/10 text-gray-400'
          }`}
        >
          {showOnlyNetwork ? '🔗 Network Only' : '📋 All Events'}
        </button>
      </div>

      {/* Request-Response Pairs */}
      <div className="rounded-2xl border border-white/5 bg-[#12121a] p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-blue-500"></span>
          Request → Response Pairs ({pairs.length})
        </h3>
        <div className="space-y-2">
          {pairs.map((pair, idx) => (
            <div key={idx} className="flex items-stretch gap-1 group">
              {/* Request */}
              <div className="flex-1 rounded-l-xl bg-blue-500/5 border border-blue-500/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                    {pair.request?.method}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 truncate">
                    {pair.request?.url?.replace(/https?:\/\/[^/]+/, '')}
                  </span>
                </div>
                {pair.request?.timestamp && (
                  <span className="text-[9px] text-gray-600 font-mono mt-0.5 block">
                    {pair.request.timestamp}
                  </span>
                )}
              </div>

              {/* Arrow */}
              <div className="flex items-center px-2">
                <span className={`text-xs ${
                  pair.error ? 'text-red-400' : pair.response ? 'text-emerald-400' : 'text-gray-600'
                }`}>→</span>
              </div>

              {/* Response */}
              <div className={`flex-1 rounded-r-xl px-3 py-2 border ${
                pair.error
                  ? 'bg-red-500/5 border-red-500/10'
                  : pair.response
                    ? 'bg-emerald-500/5 border-emerald-500/10'
                    : 'bg-gray-500/5 border-gray-500/10'
              }`}>
                {pair.response || pair.error ? (
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      pair.error
                        ? 'text-red-400 bg-red-500/20'
                        : (pair.response?.statusCode || 0) < 300
                          ? 'text-emerald-400 bg-emerald-500/20'
                          : 'text-yellow-400 bg-yellow-500/20'
                    }`}>
                      {pair.error?.statusCode || pair.response?.statusCode}
                    </span>
                    <span className={`text-[10px] font-mono ${
                      (pair.error?.responseTime || pair.response?.responseTime || 0) > 3000
                        ? 'text-orange-400' : 'text-gray-400'
                    }`}>
                      {(pair.error?.responseTime || pair.response?.responseTime || 0) >= 1000
                        ? `${((pair.error?.responseTime || pair.response?.responseTime || 0) / 1000).toFixed(1)}s`
                        : `${pair.error?.responseTime || pair.response?.responseTime || 0}ms`
                      }
                    </span>
                    {pair.error && (
                      <span className="text-[9px] text-red-400">ERROR</span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-600">No response</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Waterfall Chart */}
      <div className="rounded-2xl border border-white/5 bg-[#12121a] p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-yellow-500"></span>
          Response Time Waterfall ({responsesAndErrors.length})
        </h3>
        <div className="space-y-0.5">
          {responsesAndErrors.map((entry, idx) => (
            <WaterfallBar key={entry.id} entry={entry} maxTime={maxTime} index={idx} />
          ))}
        </div>
      </div>

      {/* Time Segments */}
      {timeSegments.length > 1 && (
        <div className="rounded-2xl border border-white/5 bg-[#12121a] p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-cyan-500"></span>
            Activity Timeline
          </h3>
          <div className="space-y-4">
            {timeSegments.map((seg, idx) => {
              const networkCount = seg.entries.filter(e => e.type === 'request' || e.type === 'response' || e.type === 'error').length;
              const lifecycleCount = seg.entries.filter(e => e.type === 'lifecycle').length;
              const debugCount = seg.entries.filter(e => e.type === 'debug' || e.type === 'info' || e.type === 'webview' || e.type === 'validation').length;

              return (
                <div key={idx} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-[#12121a] z-10"></div>
                    {idx < timeSegments.length - 1 && <div className="w-0.5 flex-1 bg-white/5 min-h-[30px]"></div>}
                  </div>
                  <div className="flex-1 pb-4">
                    <span className="text-xs font-mono text-cyan-400">{seg.time || 'Start'}</span>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {networkCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {networkCount} network
                        </span>
                      )}
                      {lifecycleCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {lifecycleCount} lifecycle
                        </span>
                      )}
                      {debugCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                          {debugCount} debug
                        </span>
                      )}
                      <span className="text-[10px] text-gray-600">
                        {seg.entries.length} total
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Stream (if showing all) */}
      {!showOnlyNetwork && (
        <div className="rounded-2xl border border-white/5 bg-[#12121a] p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-purple-500"></span>
            Full Event Stream ({networkEntries.length})
          </h3>
          <div className="space-y-1 max-h-[600px] overflow-auto">
            {networkEntries.map((entry, idx) => {
              const typeColors: Record<string, string> = {
                request: 'text-blue-400 bg-blue-500/10',
                response: 'text-emerald-400 bg-emerald-500/10',
                error: 'text-red-400 bg-red-500/10',
                lifecycle: 'text-purple-400 bg-purple-500/10',
                heartbeat: 'text-pink-400 bg-pink-500/10',
                debug: 'text-yellow-400 bg-yellow-500/10',
                webview: 'text-cyan-400 bg-cyan-500/10',
                validation: 'text-orange-400 bg-orange-500/10',
                info: 'text-gray-400 bg-gray-500/10',
                raw: 'text-gray-500 bg-gray-500/5',
              };

              return (
                <div key={entry.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/[0.02] text-[10px]">
                  <span className="text-gray-600 w-6 text-right font-mono">{idx + 1}</span>
                  <span className={`px-1.5 py-0.5 rounded font-medium uppercase tracking-wider w-20 text-center ${typeColors[entry.type] || ''}`}>
                    {entry.subType?.split('_')[0] || entry.type}
                  </span>
                  <span className="font-mono text-gray-400 truncate flex-1">
                    {entry.url?.replace(/https?:\/\/[^/]+/, '') || entry.body?.substring(0, 80) || ''}
                  </span>
                  {entry.statusCode !== undefined && (
                    <span className={`font-mono ${entry.statusCode < 300 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {entry.statusCode}
                    </span>
                  )}
                  {entry.responseTime !== undefined && (
                    <span className="font-mono text-gray-500 w-14 text-right">
                      {entry.responseTime >= 1000 ? `${(entry.responseTime / 1000).toFixed(1)}s` : `${entry.responseTime}ms`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
