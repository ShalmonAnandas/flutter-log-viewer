'use client';

import { useState, useMemo, useCallback } from 'react';
import { ParsedLog, LogEntry } from '@/lib/logParser';
import Dashboard from './Dashboard';
import LogEntryCard from './LogEntryCard';
import FilterBar from './FilterBar';
import TimelineView from './TimelineView';
import Header from './Header';

type Tab = 'dashboard' | 'logs' | 'timeline';
type FilterType = 'all' | 'request' | 'response' | 'error' | 'lifecycle' | 'heartbeat' | 'debug' | 'webview' | 'validation';

interface Props {
  initialParsedLog: ParsedLog;
  shareId?: string;
  isShared?: boolean;
}

export default function LogViewerApp({ initialParsedLog, shareId, isShared }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'time' | 'status' | 'duration'>('time');

  const parsed = initialParsedLog;

  const filteredEntries = useMemo(() => {
    let entries = parsed.entries;

    if (filter !== 'all') {
      entries = entries.filter(e => e.type === filter);
    }

    if (statusFilter !== 'all') {
      const code = parseInt(statusFilter);
      entries = entries.filter(e =>
        e.type === 'response' || e.type === 'error'
          ? e.statusCode === code
          : statusFilter === 'all'
      );
    }

    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(e =>
        e.url?.toLowerCase().includes(q) ||
        e.body?.toLowerCase().includes(q) ||
        e.errorMessage?.toLowerCase().includes(q) ||
        e.rawLines.some(l => l.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'status') {
      entries = [...entries].sort((a, b) => (a.statusCode || 0) - (b.statusCode || 0));
    } else if (sortBy === 'duration') {
      entries = [...entries].sort((a, b) => (b.responseTime || 0) - (a.responseTime || 0));
    }

    return entries;
  }, [parsed.entries, filter, statusFilter, search, sortBy]);

  const toggleEntry = useCallback((id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedEntries(new Set(filteredEntries.map(e => e.id)));
  }, [filteredEntries]);

  const collapseAll = useCallback(() => {
    setExpandedEntries(new Set());
  }, []);

  // Count by type for filter badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: parsed.entries.length };
    for (const entry of parsed.entries) {
      counts[entry.type] = (counts[entry.type] || 0) + 1;
    }
    return counts;
  }, [parsed.entries]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        deviceInfo={parsed.deviceInfo}
        shareId={shareId}
        isShared={isShared}
      />

      {/* Tab Navigation */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 py-2">
            {(['dashboard', 'logs', 'timeline'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab === 'dashboard' && '📊 '}
                {tab === 'logs' && '📋 '}
                {tab === 'timeline' && '⏱️ '}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard stats={parsed.stats} entries={parsed.entries} />
        )}

        {activeTab === 'logs' && (
          <div>
            <FilterBar
              filter={filter}
              setFilter={setFilter}
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              typeCounts={typeCounts}
              statusCodes={Object.keys(parsed.stats.statusCodes).map(Number)}
              expandAll={expandAll}
              collapseAll={collapseAll}
              resultCount={filteredEntries.length}
            />

            <div className="space-y-2 mt-4">
              {filteredEntries.map((entry: LogEntry) => (
                <LogEntryCard
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedEntries.has(entry.id)}
                  onToggle={() => toggleEntry(entry.id)}
                />
              ))}

              {filteredEntries.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-lg text-slate-700">No log entries match your filters</p>
                  <p className="text-sm mt-2 text-slate-500">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <TimelineView entries={parsed.entries} stats={parsed.stats} />
        )}
      </main>
    </div>
  );
}
