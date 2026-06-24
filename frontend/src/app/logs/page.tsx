'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE = 'http://localhost:34002';

interface LogEntry {
  id: string;
  level: string;
  source: string;
  message: string;
  timestamp: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const limit = 50;

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (levelFilter !== 'all') params.set('level', levelFilter);
      const res = await fetch(`${API_BASE}/api/logs?${params}`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [page, levelFilter]);

  const filteredLogs = filter
    ? logs.filter(
        (l) =>
          l.message.toLowerCase().includes(filter.toLowerCase()) ||
          l.source?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  function getLevelColor(level: string) {
    switch (level) {
      case 'error': return 'destructive' as const;
      case 'warn': return 'warning' as const;
      case 'info': return 'secondary' as const;
      default: return 'outline' as const;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Logs</h2>
          <p className="text-gray-400">View system and server logs</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'error', 'warn', 'info'].map((level) => (
            <Button
              key={level}
              size="sm"
              variant={levelFilter === level ? 'default' : 'ghost'}
              onClick={() => { setLevelFilter(level); setPage(0); }}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-400">
            {filteredLogs.length} log entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No logs found</div>
          ) : (
            <div className="space-y-1 font-mono text-sm">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded px-3 py-2 hover:bg-gray-800/50"
                >
                  <Badge variant={getLevelColor(log.level)} className="shrink-0 mt-0.5">
                    {log.level}
                  </Badge>
                  <span className="text-gray-500 shrink-0 w-44">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  {log.source && (
                    <span className="text-blue-400 shrink-0">{log.source}</span>
                  )}
                  <span className="text-gray-300 break-all">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        <span className="text-sm text-gray-500">Page {page + 1}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={logs.length < limit}
          onClick={() => setPage(page + 1)}
        >
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
