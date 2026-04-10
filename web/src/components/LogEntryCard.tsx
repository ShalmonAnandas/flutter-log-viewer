'use client';

import { LogEntry } from '@/lib/logParser';
import { useState, useMemo } from 'react';

interface Props {
  entry: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    PUT: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
    PATCH: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${colors[method] || 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
      {method}
    </span>
  );
}

function StatusBadge({ code }: { code: number }) {
  const color = code < 300 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : code < 400 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
    : code < 500 ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
    : 'bg-red-500/15 text-red-400 border-red-500/30';

  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${color}`}>
      {code}
    </span>
  );
}

function TimeBadge({ time }: { time: number }) {
  const color = time < 1000 ? 'text-emerald-400' : time < 3000 ? 'text-yellow-400' : time < 10000 ? 'text-orange-400' : 'text-red-400';
  return (
    <span className={`text-[10px] font-mono ${color}`}>
      {time >= 1000 ? `${(time / 1000).toFixed(1)}s` : `${time}ms`}
    </span>
  );
}

interface Base64Image {
  label: string;
  data: string;
  mimeType: string;
}

function extractBase64Images(body: string): Base64Image[] {
  const images: Base64Image[] = [];

  // Match patterns like: fieldName: /9j/... or fieldName: iVBOR...
  // JPEG base64 starts with /9j/
  // PNG base64 starts with iVBOR
  const patterns = [
    // key: base64data patterns (Dart map style)
    /(\w+):\s*(\/9j\/[A-Za-z0-9+/=\s]{100,})/g,
    /(\w+):\s*(iVBOR[A-Za-z0-9+/=\s]{100,})/g,
    // Standalone base64 blobs
    /(?:^|\s)(\/9j\/[A-Za-z0-9+/=\s]{200,})/g,
    /(?:^|\s)(iVBOR[A-Za-z0-9+/=\s]{200,})/g,
  ];

  const seen = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const label = match.length === 3 ? match[1] : 'image';
      const raw = match.length === 3 ? match[2] : match[1];
      const data = raw.replace(/\s+/g, '');
      const key = data.slice(0, 50);
      if (seen.has(key)) continue;
      seen.add(key);
      const mimeType = data.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
      images.push({ label, data, mimeType });
    }
  }

  return images;
}

function formatJsonBody(body: string): string {
  // Try to parse and prettify JSON
  try {
    // Clean up the body - remove leading "mb:" or similar prefixes
    let cleaned = body.trim();
    if (cleaned.startsWith('mb:')) {
      cleaned = cleaned.substring(3).trim();
    }

    // Try to fix Dart-style maps to JSON (single quotes → double quotes, no quotes on keys)
    let jsonAttempt = cleaned
      .replace(/(\w+):/g, '"$1":')
      .replace(/'/g, '"');

    const parsed = JSON.parse(jsonAttempt);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // If it's already valid JSON
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  }
}

function Base64ImagePreview({ images }: { images: Base64Image[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <div>
      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
        🖼️ Embedded Images ({images.length})
      </label>
      <div className="mt-2 flex flex-wrap gap-3">
        {images.map((img, idx) => (
          <div key={idx} className="group relative">
            <button
              onClick={() => setExpanded(expanded === `${idx}` ? null : `${idx}`)}
              className="block rounded-xl overflow-hidden border border-white/10 hover:border-blue-500/30 transition-all shadow-lg hover:shadow-blue-500/10"
            >
              <div className="bg-white/5 px-2 py-1 flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-mono">{img.label}</span>
                <span className="text-[10px] text-gray-600">
                  {img.mimeType === 'image/jpeg' ? 'JPEG' : 'PNG'}
                  {' · '}
                  {Math.round(img.data.length * 0.75 / 1024)}KB
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${img.mimeType};base64,${img.data}`}
                alt={img.label}
                className="max-w-[160px] max-h-[160px] object-contain bg-gray-900"
                loading="lazy"
              />
            </button>

            {/* Expanded lightbox */}
            {expanded === `${idx}` && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={() => setExpanded(null)}
              >
                <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                      <span className="text-xs text-gray-400">
                        <span className="font-mono text-blue-400">{img.label}</span>
                        {' · '}{img.mimeType === 'image/jpeg' ? 'JPEG' : 'PNG'}
                        {' · '}{Math.round(img.data.length * 0.75 / 1024)}KB
                      </span>
                      <button onClick={() => setExpanded(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${img.mimeType};base64,${img.data}`}
                      alt={img.label}
                      className="max-w-[85vw] max-h-[80vh] object-contain"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadersTable({ headers }: { headers: { key: string; value: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/5">
            <th className="py-1.5 px-2 text-left text-gray-500 font-medium w-1/3">Header</th>
            <th className="py-1.5 px-2 text-left text-gray-500 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {headers.map((h, i) => (
            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              <td className="py-1.5 px-2 font-mono text-purple-400 break-all">{h.key}</td>
              <td className="py-1.5 px-2 font-mono text-gray-400 break-all">{h.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LogEntryCard({ entry, isExpanded, onToggle }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const [bodyTab, setBodyTab] = useState<'formatted' | 'raw'>('formatted');

  const formattedBody = useMemo(() => {
    if (!entry.body) return '';
    return formatJsonBody(entry.body);
  }, [entry.body]);

  // Check if body contains base64 (likely file upload)
  const isBase64Body = entry.body && entry.body.length > 500 && /^[A-Za-z0-9+/=\s]+$/.test(entry.body.replace(/\s/g, '').slice(-200));
  const truncatedBody = isBase64Body && entry.body ? entry.body.slice(0, 200) + '\n... [Base64 data truncated - ' + Math.round(entry.body.length / 1024) + 'KB]' : undefined;

  const typeConfig: Record<string, { icon: string; border: string; bg: string; label: string }> = {
    request: { icon: '📤', border: 'border-blue-500/20', bg: 'bg-blue-500/[0.03]', label: 'REQUEST' },
    response: { icon: '📥', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.03]', label: 'RESPONSE' },
    error: { icon: '❌', border: 'border-red-500/20', bg: 'bg-red-500/[0.03]', label: 'ERROR' },
    lifecycle: { icon: '🔄', border: 'border-purple-500/20', bg: 'bg-purple-500/[0.03]', label: 'LIFECYCLE' },
    heartbeat: { icon: '💓', border: 'border-pink-500/20', bg: 'bg-pink-500/[0.03]', label: 'HEARTBEAT' },
    info: { icon: 'ℹ️', border: 'border-gray-500/20', bg: 'bg-gray-500/[0.03]', label: 'INFO' },
    raw: { icon: '📝', border: 'border-gray-500/20', bg: 'bg-gray-500/[0.03]', label: 'RAW' },
  };

  const config = typeConfig[entry.type] || typeConfig.raw;

  // Compact view for lifecycle/heartbeat
  if (entry.type === 'lifecycle' || entry.type === 'heartbeat') {
    const stateColors: Record<string, string> = {
      'AppLifecycleState.resumed': 'text-emerald-400',
      'AppLifecycleState.inactive': 'text-yellow-400',
      'AppLifecycleState.paused': 'text-orange-400',
      'AppLifecycleState.hidden': 'text-gray-500',
    };

    return (
      <div className={`rounded-xl border ${config.border} ${config.bg} px-4 py-2 flex items-center gap-3`}>
        <span className="text-sm">{config.icon}</span>
        <span className={`text-xs font-mono ${stateColors[entry.body || ''] || 'text-gray-400'}`}>
          {entry.body}
        </span>
        <span className="text-[10px] text-gray-600">Line {entry.lineStart + 1}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm">{config.icon}</span>

        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider w-16 shrink-0">
          {config.label}
        </span>

        {entry.method && <MethodBadge method={entry.method} />}
        {entry.statusCode !== undefined && <StatusBadge code={entry.statusCode} />}
        {entry.responseTime !== undefined && <TimeBadge time={entry.responseTime} />}

        {entry.url && (
          <span className="text-xs font-mono text-gray-400 truncate flex-1 text-left">
            {entry.url.replace(/https?:\/\/[^/]+/, '')}
          </span>
        )}

        {entry.timestamp && (
          <span className="text-[10px] font-mono text-gray-600 hidden lg:block shrink-0">
            {entry.timestamp}
          </span>
        )}

        <span className="text-[10px] text-gray-600 shrink-0">L{entry.lineStart + 1}</span>

        <svg className={`w-4 h-4 text-gray-600 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/5 px-4 py-4 space-y-4">
          {/* URL */}
          {entry.url && (
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">URL</label>
              <p className="text-xs font-mono text-blue-400 mt-1 break-all select-all">{entry.url}</p>
            </div>
          )}

          {/* Extras */}
          {entry.extras && Object.keys(entry.extras).length > 0 && (
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Extras</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(entry.extras).map(([k, v]) => (
                  <div key={k} className="px-2 py-1 rounded-lg bg-white/5 text-xs">
                    <span className="text-gray-500">{k}:</span>{' '}
                    <span className="font-mono text-cyan-400">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Headers */}
          {entry.headers && entry.headers.length > 0 && (
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Headers ({entry.headers.length})
              </label>
              <div className="mt-1 rounded-lg bg-black/20 border border-white/5 overflow-hidden">
                <HeadersTable headers={entry.headers} />
              </div>
            </div>
          )}

          {/* Body */}
          {entry.body && (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Body</label>
                {!isBase64Body && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setBodyTab('formatted')}
                      className={`px-2 py-0.5 rounded text-[10px] ${bodyTab === 'formatted' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Formatted
                    </button>
                    <button
                      onClick={() => setBodyTab('raw')}
                      className={`px-2 py-0.5 rounded text-[10px] ${bodyTab === 'raw' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Raw
                    </button>
                  </div>
                )}
              </div>
              <pre className="mt-1 text-xs font-mono text-gray-400 bg-black/30 rounded-lg p-3 overflow-auto max-h-96 whitespace-pre-wrap border border-white/5 select-all">
                {isBase64Body
                  ? truncatedBody
                  : bodyTab === 'formatted'
                    ? formattedBody
                    : entry.body}
              </pre>
            </div>
          )}

          {/* Error Info */}
          {entry.errorType && (
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Error Type</label>
              <p className="text-xs font-mono text-red-400 mt-1">{entry.errorType}</p>
            </div>
          )}
          {entry.errorMessage && (
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Error Message</label>
              <pre className="mt-1 text-xs font-mono text-red-300/80 bg-red-500/5 rounded-lg p-3 whitespace-pre-wrap border border-red-500/10">
                {entry.errorMessage}
              </pre>
            </div>
          )}

          {/* Raw Toggle */}
          <div>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
            >
              {showRaw ? '▼' : '▶'} Raw Log Lines ({entry.rawLines.length} lines)
            </button>
            {showRaw && (
              <pre className="mt-2 text-[10px] font-mono text-gray-600 bg-black/30 rounded-lg p-3 overflow-auto max-h-60 whitespace-pre-wrap border border-white/5">
                {entry.rawLines.join('\n')}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
