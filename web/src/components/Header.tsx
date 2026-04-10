'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
interface Props {
  deviceInfo?: string;
  shareId?: string;
  isShared?: boolean;
}

export default function Header({ deviceInfo, shareId, isShared }: Props) {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setUser(d.user);
    }).catch(() => {});
  }, []);

  const handleLogin = async () => {
    setLoginError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setShowLogin(false);
        setUsername('');
        setPassword('');
      } else {
        setLoginError(data.error);
      }
    } catch {
      setLoginError('Connection error');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setUser(null);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/shared/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                 <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                   Flutter Log Viewer
                 </h1>
                 <p className="text-xs text-slate-500">Advanced Log Analysis Platform</p>
              </div>
            </Link>

            {deviceInfo && (
              <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500">Device:</span>
                <span className="text-xs font-mono text-blue-700">{deviceInfo}</span>
              </div>
            )}

            {isShared && shareId && (
              <div className="hidden sm:flex items-center gap-2 ml-2 px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200">
                <span className="text-xs text-violet-700">Shared Log</span>
                <button
                  onClick={copyShareLink}
                  className="text-xs text-violet-700 hover:text-violet-800 underline"
                >
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">
                  <span className="text-blue-700">@{user.username}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(!showLogin)}
                className="px-4 py-2 text-sm rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Login modal */}
        {showLogin && !user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-sm shadow-2xl">
              <h2 className="text-lg font-bold mb-1">Sign In / Register</h2>
              <p className="text-xs text-slate-500 mb-5">First login creates your account automatically</p>
              {loginError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {loginError}
                </div>
              )}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                   className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                   className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleLogin}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 transition-all shadow-sm"
                >
                  Continue
                </button>
                <button
                  onClick={() => { setShowLogin(false); setLoginError(''); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
