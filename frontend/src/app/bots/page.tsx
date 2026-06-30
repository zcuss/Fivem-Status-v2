'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Play, Square, Trash2, RefreshCw } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:34002';

interface Bot {
  id: string;
  name: string;
  status: string;
  serverId: string;
  token?: string;
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBot, setNewBot] = useState({ name: '', serverId: '', token: '' });

  async function fetchBots() {
    try {
      const res = await fetch(`${API_BASE}/api/bots`);
      const data = await res.json();
      setBots(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch bots:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBots();
  }, []);

  async function addBot() {
    try {
      await fetch(`${API_BASE}/api/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBot),
      });
      setNewBot({ name: '', serverId: '', token: '' });
      setShowAdd(false);
      fetchBots();
    } catch (e) {
      console.error('Failed to add bot:', e);
    }
  }

  async function startBot(id: string) {
    try {
      await fetch(`${API_BASE}/api/bots/${id}/start`, { method: 'POST' });
      fetchBots();
    } catch (e) {
      console.error('Failed to start bot:', e);
    }
  }

  async function stopBot(id: string) {
    try {
      await fetch(`${API_BASE}/api/bots/${id}/stop`, { method: 'POST' });
      fetchBots();
    } catch (e) {
      console.error('Failed to stop bot:', e);
    }
  }

  async function removeBot(id: string) {
    if (!confirm('Remove this bot?')) return;
    try {
      await fetch(`${API_BASE}/api/bots/${id}`, { method: 'DELETE' });
      fetchBots();
    } catch (e) {
      console.error('Failed to remove bot:', e);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading bots...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bots</h2>
          <p className="text-muted-foreground">Manage your Discord/TS3 bots</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchBots}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-2 h-4 w-4" /> Add Bot
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Bot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                placeholder="Bot name"
                value={newBot.name}
                onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
              />
              <Input
                placeholder="Server ID"
                value={newBot.serverId}
                onChange={(e) => setNewBot({ ...newBot, serverId: e.target.value })}
              />
              <Input
                placeholder="Bot token"
                type="password"
                value={newBot.token}
                onChange={(e) => setNewBot({ ...newBot, token: e.target.value })}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={addBot} disabled={!newBot.name}>Save</Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {bots.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No bots configured. Click &quot;Add Bot&quot; to get started.
            </CardContent>
          </Card>
        ) : (
          bots.map((bot) => (
            <Card key={bot.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{bot.name}</h3>
                    <Badge
                      variant={
                        bot.status === 'running'
                          ? 'success'
                          : bot.status === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {bot.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Server: {bot.serverId} | ID: {bot.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  {bot.status !== 'running' ? (
                    <Button size="sm" variant="outline" onClick={() => startBot(bot.id)}>
                      <Play className="mr-1 h-4 w-4" /> Start
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => stopBot(bot.id)}>
                      <Square className="mr-1 h-4 w-4" /> Stop
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => removeBot(bot.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
