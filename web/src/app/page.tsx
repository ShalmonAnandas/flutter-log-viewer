'use client';

import { useState, useCallback, useEffect } from 'react';
import { parseFlutterLog, ParsedLog } from '@/lib/logParser';
import LogViewerApp from '@/components/LogViewerApp';
import Header from '@/components/Header';

export default function Home() {
  const [parsedLog, setParsedLog] = useState<ParsedLog | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [savedLogs, setSavedLogs] = useState<{ id: string; name: string; createdAt: string; blobUrl: string }[]>([]);
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) {
        setUser(d.user);
        // Load saved logs
        fetch('/api/logs').then(r => r.json()).then(data => {
          if (data.logs) setSavedLogs(data.logs);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const processFile = useCallback((file: File) => {
    setIsLoading(true);
    setShareUrl(null);
    setShareError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
      const parsed = parseFlutterLog(text);
      setParsedLog(parsed);
      setIsLoading(false);
    };
    reader.readAsText(file);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.txt')) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleShare = async () => {
    if (!rawText) return;
    setShareError(null);
    try {
      const blob = new Blob([rawText], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', blob, fileName || 'log.txt');

      const res = await fetch('/api/share', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        const fullUrl = `${window.location.origin}${data.shareUrl}`;
        setShareUrl(fullUrl);
        navigator.clipboard.writeText(fullUrl);
      } else {
        setShareError(data.error);
      }
    } catch (err) {
      console.error('Share failed:', err);
      setShareError('Failed to share. Ensure BLOB_READ_WRITE_TOKEN is configured on Vercel.');
    }
  };

  const handleSave = async () => {
    if (!rawText || !user) return;
    try {
      const blob = new Blob([rawText], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', blob, fileName || 'log.txt');
      formData.append('name', fileName || 'Untitled Log');

      const res = await fetch('/api/logs', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setSavedLogs(prev => [{ ...data, createdAt: new Date().toISOString(), blobUrl: data.url }, ...prev]);
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const loadSavedLog = async (log: { blobUrl: string; name: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch(log.blobUrl);
      const text = await res.text();
      setRawText(text);
      setFileName(log.name);
      const parsed = parseFlutterLog(text);
      setParsedLog(parsed);
    } catch (err) {
      console.error('Failed to load saved log:', err);
    }
    setIsLoading(false);
  };

  // If log is loaded, show viewer
  if (parsedLog) {
    return (
      <div>
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2">
          <div className="max-w-[1800px] mx-auto flex items-center gap-3 flex-wrap">
            <button
              onClick={() => { setParsedLog(null); setShareUrl(null); }}
               className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs border border-slate-200 transition-all flex items-center gap-1.5"
            >
              ← New Log
            </button>
            <span className="text-xs text-slate-500 font-mono">{fileName}</span>

            <div className="ml-auto flex items-center gap-2">
              {user && (
                <button
                  onClick={handleSave}
                   className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs border border-emerald-200 transition-all"
                >
                  💾 Save
                </button>
              )}
              <button
                onClick={handleShare}
                 className="px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs border border-violet-200 transition-all"
              >
                🔗 Share
              </button>
            </div>

            {shareUrl && (
              <div className="w-full flex items-center gap-2 mt-1">
                 <span className="text-xs text-emerald-700">✓ Copied to clipboard!</span>
                <input
                  readOnly
                  value={shareUrl}
                   className="flex-1 px-3 py-1 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-600"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
              </div>
            )}
            {shareError && (
              <div className="w-full mt-1">
                 <span className="text-xs text-red-600">{shareError}</span>
              </div>
            )}
          </div>
        </div>
        <LogViewerApp initialParsedLog={parsedLog} />
      </div>
    );
  }

  // Upload page
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent mb-3">
            Flutter Log Viewer
          </h1>
          <p className="text-slate-500 text-lg max-w-lg mx-auto">
            Upload your Flutter log files and visualize every data point with advanced analytics, timeline views, and beautiful formatting.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          className={`relative rounded-2xl border-2 border-dashed p-16 text-center transition-all duration-300 cursor-pointer ${
            isDragging
                ? 'border-blue-400 bg-blue-50 shadow-lg shadow-blue-200/60'
                : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
          }`}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-slate-600">Parsing log file...</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                  isDragging ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <svg className={`w-8 h-8 transition-colors ${isDragging ? 'text-blue-500' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                   <p className="text-lg font-medium text-slate-700">
                    Drop your Flutter log file here
                  </p>
                   <p className="text-sm text-slate-500 mt-1">
                    or click to browse • Supports .txt files
                  </p>
                </div>
              </div>
              <input
                id="fileInput"
                type="file"
                accept=".txt,.log"
                onChange={handleFileInput}
                className="hidden"
              />
            </>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          {[
            { icon: '📊', title: 'Rich Dashboard', desc: 'Status codes, response times, endpoint performance, error rates' },
            { icon: '🔍', title: 'Deep Analysis', desc: 'Filter by type, search bodies, inspect headers, view base64 images' },
            { icon: '🔗', title: 'Share & Save', desc: 'Generate shareable links, save logs with optional login' },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="text-sm font-semibold text-slate-700 mt-3">{f.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Saved Logs */}
        {user && savedLogs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              📂 Your Saved Logs
            </h2>
            <div className="space-y-2">
              {savedLogs.map((log, i) => (
                <button
                  key={i}
                  onClick={() => loadSavedLog(log)}
                   className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left"
                >
                   <span className="text-slate-500">📄</span>
                   <span className="text-sm text-slate-700 flex-1">{log.name}</span>
                   <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
