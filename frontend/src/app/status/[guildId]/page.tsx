'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, Clock, Activity, Wifi, WifiOff } from 'lucide-react';

interface ServerInfo {
  name: string;
  status: string;
  players: number;
  maxPlayers: number;
  uptime: string;
  address: string;
  port: number;
  lastUpdate: string;
  recentActivity?: { event: string; player?: string; timestamp: string }[];
}

export default function PublicStatusPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) ?? "";
  const [server, setServer] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchStatus() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/backend/servers/${guildId}`);
      if (!res.ok) {
        setError('Server not found');
        return;
      }
      const data = await res.json();
      setServer(data);
    } catch {
      setError('Unable to fetch server status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [guildId]);

  if (loading && !server) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading status...
        </div>
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-8 text-center">
            <WifiOff className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Server Not Found</h1>
            <p className="text-muted-foreground">{error || 'Unable to load server status'}</p>
            <button
              onClick={fetchStatus}
              className="mt-4 px-4 py-2 rounded bg-secondary text-white hover:bg-accent transition"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOnline = server.status === 'online';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-6 w-6 text-green-500" />
            ) : (
              <WifiOff className="h-6 w-6 text-red-500" />
            )}
            <h1 className="text-3xl font-bold text-white">{server.name}</h1>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Badge variant={isOnline ? 'success' : 'destructive'} className="text-sm px-3 py-1">
              {isOnline ? '● Online' : '● Offline'}
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-6 text-center">
              <Users className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{server.players}</div>
              <div className="text-xs text-muted-foreground">/ {server.maxPlayers} Players</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{server.uptime || '—'}</div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <Activity className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm font-bold text-white truncate">{server.address}:{server.port}</div>
              <div className="text-xs text-muted-foreground">Address</div>
            </CardContent>
          </Card>
        </div>

        {/* Player Bar */}
        {server.maxPlayers > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Player capacity</span>
                <span className="text-white font-medium">{server.players}/{server.maxPlayers}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.min((server.players / server.maxPlayers) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {server.recentActivity && server.recentActivity.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {server.recentActivity.slice(0, 8).map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <Activity className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-foreground">
                      {activity.player && <span className="text-blue-400">{activity.player} </span>}
                      {activity.event}
                    </span>
                    <span className="text-muted-foreground text-xs ml-auto shrink-0">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          Last updated: {server.lastUpdate ? new Date(server.lastUpdate).toLocaleString() : '—'}
          <br />
          Powered by ⚡ Fivem-Status
        </div>
      </div>
    </div>
  );
}
