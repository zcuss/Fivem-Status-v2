'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, RefreshCw, Trash2, Globe } from 'lucide-react';

const API_BASE = 'http://localhost:34002';

interface ServerInfo {
  id: string;
  name: string;
  address: string;
  port: number;
  status: string;
  players: number;
  maxPlayers: number;
}

export default function ServersPage() {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newServer, setNewServer] = useState({ name: '', address: '', port: 30120 });

  async function fetchServers() {
    try {
      const res = await fetch(`${API_BASE}/api/servers`);
      const data = await res.json();
      setServers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch servers:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServers();
  }, []);

  async function addServer() {
    try {
      await fetch(`${API_BASE}/api/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServer),
      });
      setNewServer({ name: '', address: '', port: 30120 });
      setShowAdd(false);
      fetchServers();
    } catch (e) {
      console.error('Failed to add server:', e);
    }
  }

  async function removeServer(id: string) {
    if (!confirm('Remove this server?')) return;
    try {
      await fetch(`${API_BASE}/api/servers/${id}`, { method: 'DELETE' });
      fetchServers();
    } catch (e) {
      console.error('Failed to remove server:', e);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading servers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Servers</h2>
          <p className="text-gray-400">Manage FiveM game servers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchServers}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-2 h-4 w-4" /> Add Server
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Server</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                placeholder="Server name"
                value={newServer.name}
                onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
              />
              <Input
                placeholder="Address (IP or domain)"
                value={newServer.address}
                onChange={(e) => setNewServer({ ...newServer, address: e.target.value })}
              />
              <Input
                placeholder="Port"
                type="number"
                value={newServer.port}
                onChange={(e) => setNewServer({ ...newServer, port: parseInt(e.target.value) || 30120 })}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={addServer} disabled={!newServer.name || !newServer.address}>Save</Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {servers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No servers configured. Click &quot;Add Server&quot; to get started.
            </CardContent>
          </Card>
        ) : (
          servers.map((server) => (
            <Card key={server.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <h3 className="font-semibold text-lg">{server.name}</h3>
                    <Badge
                      variant={
                        server.status === 'online'
                          ? 'success'
                          : server.status === 'offline'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {server.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {server.address}:{server.port} | Players: {server.players}/{server.maxPlayers}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => removeServer(server.id)}>
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
