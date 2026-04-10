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
    GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    POST: 'bg-blue-100 text-blue-700 border-blue-200',
    PUT: 'bg-amber-100 text-amber-700 border-amber-200',
    DELETE: 'bg-rose-100 text-rose-700 border-rose-200',
    PATCH: 'bg-violet-100 text-violet-700 border-violet-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${colors[method] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {method}
    </span>
  );
}

function StatusBadge({ code }: { code: number }) {
  const color = code < 300 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : code < 400 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : code < 500 ? 'bg-orange-100 text-orange-700 border-orange-200'
    : 'bg-red-100 text-red-700 border-red-200';

  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${color}`}>
      {code}
    </span>
  );
}

function TimeBadge({ time }: { time: number }) {
  const color = time < 1000 ? 'text-emerald-700' : time < 3000 ? 'text-amber-700' : time < 10000 ? 'text-orange-700' : 'text-red-700';
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

  const normalize = (raw: string) => {
    let data = raw
      .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
      .replace(/\\\//g, '/')
      .replace(/\s+/g, '')
      .replace(/[^A-Za-z0-9+/=]/g, '');
    if (!data) return '';
    const pad = data.length % 4;
    if (pad !== 0) data += '='.repeat(4 - pad);
    return data;
  };

  const patterns = [
    /["']?([A-Za-z0-9_.-]+)["']?\s*[:=]\s*["']?(data:image\/(?:jpeg|jpg|png);base64,[A-Za-z0-9+/=\s\\/]{120,}|\/9j\/[A-Za-z0-9+/=\s\\/]{120,}|iVBOR[A-Za-z0-9+/=\s\\/]{120,})["']?/g,
    /(?:^|[\s{[(,"])(data:image\/(?:jpeg|jpg|png);base64,[A-Za-z0-9+/=\s\\/]{120,}|\/9j\/[A-Za-z0-9+/=\s\\/]{120,}|iVBOR[A-Za-z0-9+/=\s\\/]{120,})(?=$|[\s}\]),"])/g,
  ];

  const seen = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const hasLabel = match.length > 2;
      const label = hasLabel ? match[1] : 'image';
      const raw = hasLabel ? match[2] : match[1];
      const data = normalize(raw);
      if (!data) continue;
      if (data.length < 120) continue;

      const key = `${data.slice(0, 80)}:${data.length}`;
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
    const jsonAttempt = cleaned
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
               className="block rounded-xl overflow-hidden border border-slate-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
             >
               <div className="bg-slate-50 px-2 py-1 flex items-center gap-2">
                 <span className="text-[10px] text-slate-600 font-mono">{img.label}</span>
                 <span className="text-[10px] text-slate-500">
                   {img.mimeType === 'image/jpeg' ? 'JPEG' : 'PNG'}
                   {' · '}
                   {Math.round(img.data.length * 0.75 / 1024)}KB
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img
                 src={`data:${img.mimeType};base64,${img.data}`}
                 alt={img.label}
                 className="max-w-[160px] max-h-[160px] object-contain bg-white"
                 loading="lazy"
               />
             </button>

            {/* Expanded lightbox */}
            {expanded === `${idx}` && (
              <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
                  onClick={() => setExpanded(null)}
                >
                  <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
                        <span className="text-xs text-slate-600">
                          <span className="font-mono text-blue-600">{img.label}</span>
                          {' · '}{img.mimeType === 'image/jpeg' ? 'JPEG' : 'PNG'}
                          {' · '}{Math.round(img.data.length * 0.75 / 1024)}KB
                        </span>
                        <button onClick={() => setExpanded(null)} className="text-slate-500 hover:text-slate-800 text-lg">✕</button>
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
          <tr className="border-b border-slate-200">
            <th className="py-1.5 px-2 text-left text-slate-500 font-medium w-1/3">Header</th>
            <th className="py-1.5 px-2 text-left text-slate-500 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {headers.map((h, i) => (
             <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
               <td className="py-1.5 px-2 font-mono text-violet-700 break-all">{h.key}</td>
               <td className="py-1.5 px-2 font-mono text-slate-700 break-all">{h.value}</td>
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

  // Extract base64 images from body
  const base64Images = useMemo(() => {
    if (!entry.body) return [];
    return extractBase64Images(entry.body);
  }, [entry.body]);

  // Check if body contains base64 (likely file upload)
  const isBase64Body = entry.body && entry.body.length > 500 && /^[A-Za-z0-9+/=\s]+$/.test(entry.body.replace(/\s/g, '').slice(-200));
  const truncatedBody = isBase64Body && entry.body ? entry.body.slice(0, 200) + '\n... [Base64 data truncated - ' + Math.round(entry.body.length / 1024) + 'KB]' : undefined;

  const typeConfig: Record<string, { icon: string; border: string; bg: string; label: string }> = {
    request: { icon: '📤', border: 'border-blue-200', bg: 'bg-blue-50', label: 'REQUEST' },
    response: { icon: '📥', border: 'border-emerald-200', bg: 'bg-emerald-50', label: 'RESPONSE' },
    error: { icon: '❌', border: 'border-red-200', bg: 'bg-red-50', label: 'ERROR' },
    lifecycle: { icon: '🔄', border: 'border-violet-200', bg: 'bg-violet-50', label: 'LIFECYCLE' },
    heartbeat: { icon: '💓', border: 'border-pink-200', bg: 'bg-pink-50', label: 'HEARTBEAT' },
    debug: { icon: '🐛', border: 'border-amber-200', bg: 'bg-amber-50', label: 'DEBUG' },
    webview: { icon: '🌐', border: 'border-cyan-200', bg: 'bg-cyan-50', label: 'WEBVIEW' },
    validation: { icon: '✅', border: 'border-orange-200', bg: 'bg-orange-50', label: 'VALIDATION' },
    info: { icon: 'ℹ️', border: 'border-slate-200', bg: 'bg-slate-50', label: 'INFO' },
    raw: { icon: '📝', border: 'border-slate-200', bg: 'bg-slate-50', label: 'RAW' },
  };

  const config = typeConfig[entry.type] || typeConfig.raw;

  // Compact view for lifecycle/heartbeat/webview/debug (single-line entries)
  if (entry.type === 'lifecycle' || entry.type === 'heartbeat' || (entry.type === 'webview' && !isExpanded) || (entry.type === 'debug' && !entry.body?.includes('\n') && (entry.body?.length || 0) < 200)) {
    const stateColors: Record<string, string> = {
      'AppLifecycleState.resumed': 'text-emerald-700',
      'AppLifecycleState.inactive': 'text-amber-700',
      'AppLifecycleState.paused': 'text-orange-700',
      'AppLifecycleState.hidden': 'text-slate-500',
    };

    const heartbeatColors: Record<string, string> = {
      'heartbeat_start': 'text-emerald-700',
      'heartbeat_stop': 'text-orange-700',
      'heartbeat_tick': 'text-pink-700',
      'heartbeat_error': 'text-red-700',
      'heartbeat_api_call': 'text-blue-700',
    };

    const bodyColor = entry.type === 'lifecycle' ? stateColors[entry.body || ''] || 'text-gray-400'
      : entry.type === 'heartbeat' ? heartbeatColors[entry.subType || ''] || 'text-pink-400'
      : entry.type === 'webview' ? 'text-cyan-700'
      : 'text-amber-700';

    return (
      <div className={`rounded-xl border ${config.border} ${config.bg} px-4 py-2 flex items-center gap-3`}>
        <span className="text-sm">{config.icon}</span>
        {entry.subType && (
           <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">
            {entry.subType.replace(/_/g, ' ')}
          </span>
        )}
        <span className={`text-xs font-mono ${bodyColor} truncate flex-1`}>
          {entry.body}
        </span>
         {entry.timestamp && (
           <span className="text-[10px] text-slate-500 font-mono hidden lg:block">{entry.timestamp}</span>
         )}
         <span className="text-[10px] text-slate-500">L{entry.lineStart + 1}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/60 transition-colors"
      >
        <span className="text-sm">{config.icon}</span>

         <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider w-16 shrink-0">
          {config.label}
        </span>

        {entry.method && <MethodBadge method={entry.method} />}
        {entry.statusCode !== undefined && <StatusBadge code={entry.statusCode} />}
        {entry.responseTime !== undefined && <TimeBadge time={entry.responseTime} />}

        {entry.url && (
           <span className="text-xs font-mono text-slate-700 truncate flex-1 text-left">
            {entry.url.replace(/https?:\/\/[^/]+/, '')}
          </span>
        )}

        {entry.timestamp && (
           <span className="text-[10px] font-mono text-slate-500 hidden lg:block shrink-0">
            {entry.timestamp}
          </span>
        )}

         <span className="text-[10px] text-slate-500 shrink-0">L{entry.lineStart + 1}</span>

         <svg className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 px-4 py-4 space-y-4">
          {/* URL */}
          {entry.url && (
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">URL</label>
              <p className="text-xs font-mono text-blue-700 mt-1 break-all select-all">{entry.url}</p>
            </div>
          )}

          {/* Extras */}
          {entry.extras && Object.keys(entry.extras).length > 0 && (
            <div>
               <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Extras</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(entry.extras).map(([k, v]) => (
                   <div key={k} className="px-2 py-1 rounded-lg bg-white text-xs border border-slate-200">
                     <span className="text-slate-500">{k}:</span>{' '}
                     <span className="font-mono text-cyan-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Headers */}
          {entry.headers && entry.headers.length > 0 && (
            <div>
                 <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                Headers ({entry.headers.length})
              </label>
               <div className="mt-1 rounded-lg bg-white border border-slate-200 overflow-hidden">
                <HeadersTable headers={entry.headers} />
              </div>
            </div>
          )}

          {/* Body */}
          {entry.body && (
            <div>
              <div className="flex items-center justify-between">
                 <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Body</label>
                {!isBase64Body && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setBodyTab('formatted')}
                       className={`px-2 py-0.5 rounded text-[10px] ${bodyTab === 'formatted' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Formatted
                    </button>
                    <button
                      onClick={() => setBodyTab('raw')}
                       className={`px-2 py-0.5 rounded text-[10px] ${bodyTab === 'raw' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Raw
                    </button>
                  </div>
                )}
              </div>
               <pre className="mt-1 text-xs font-mono text-slate-700 bg-white rounded-lg p-3 overflow-auto max-h-96 whitespace-pre-wrap border border-slate-200 select-all">
                {isBase64Body
                  ? truncatedBody
                  : bodyTab === 'formatted'
                    ? formattedBody
                    : entry.body}
              </pre>
            </div>
          )}

          {/* Base64 Images */}
          {base64Images.length > 0 && (
            <Base64ImagePreview images={base64Images} />
          )}

          {/* Error Info */}
          {entry.errorType && (
            <div>
               <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Error Type</label>
               <p className="text-xs font-mono text-red-700 mt-1">{entry.errorType}</p>
            </div>
          )}
          {entry.errorMessage && (
            <div>
               <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Error Message</label>
               <pre className="mt-1 text-xs font-mono text-red-700 bg-red-50 rounded-lg p-3 whitespace-pre-wrap border border-red-200">
                {entry.errorMessage}
              </pre>
            </div>
          )}

          {/* Raw Toggle */}
          <div>
            <button
              onClick={() => setShowRaw(!showRaw)}
               className="text-[10px] text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
            >
              {showRaw ? '▼' : '▶'} Raw Log Lines ({entry.rawLines.length} lines)
            </button>
            {showRaw && (
               <pre className="mt-2 text-[10px] font-mono text-slate-600 bg-slate-50 rounded-lg p-3 overflow-auto max-h-60 whitespace-pre-wrap border border-slate-200">
                {entry.rawLines.join('\n')}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
