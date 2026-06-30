'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RefreshCw, Users, Shield, Edit2, Save, X, Search } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:34002';

const ROLE_HIERARCHY: Record<string, number> = {
  bot: 0,
  dev: 1,
  admin: 2,
  premium: 3,
  donator: 4,
  custom: 5,
  user: 6,
};

interface User {
  discord_id: string;
  username: string;
  name: string;
  role: string;
  max_auto: number;
  last_login: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editMaxAuto, setEditMaxAuto] = useState(0);
  const [search, setSearch] = useState('');

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  function startEditing(user: User) {
    setEditingId(user.discord_id);
    setEditRole(user.role);
    setEditMaxAuto(user.max_auto);
  }

  function cancelEditing() { setEditingId(null); }

  async function saveUser(discordId: string) {
    try {
      await fetch(`${API_BASE}/api/users/${discordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, max_auto: editMaxAuto }),
      });
      setEditingId(null);
      fetchUsers();
    } catch { console.error('Failed to update user'); }
  }

  const sortedUsers = useMemo(() => {
    const filtered = search
      ? users.filter(u =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.username?.toLowerCase().includes(search.toLowerCase()) ||
          u.discord_id?.includes(search)
        )
      : users;

    return [...filtered].sort((a, b) => {
      const ra = ROLE_HIERARCHY[a.role?.toLowerCase()] ?? 99;
      const rb = ROLE_HIERARCHY[b.role?.toLowerCase()] ?? 99;
      if (ra !== rb) return ra - rb;
      return (a.name || a.username || '').localeCompare(b.name || b.username || '');
    });
  }, [users, search]);

  // Summary counts
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) {
      const r = u.role?.toLowerCase() || 'user';
      counts[r] = (counts[r] || 0) + 1;
    }
    return counts;
  }, [users]);

  function getRoleBadge(role: string) {
    const r = role?.toLowerCase();
    if (r === 'dev') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{role}</Badge>;
    if (r === 'admin') return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">{role}</Badge>;
    if (r === 'premium') return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">{role}</Badge>;
    if (r === 'donator') return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{role}</Badge>;
    if (r === 'bot') return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">{role}</Badge>;
    return <Badge variant="secondary">{role}</Badge>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" /> User Management
          </h2>
          <p className="text-sm text-muted-foreground">Role, limits, and user accounts. Sorted: Bot → Admin → A-Z.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          <Users className="mr-1 h-3 w-3" /> {users.length} total
        </Badge>
        {Object.entries(roleCounts).sort((a, b) => (ROLE_HIERARCHY[a[0]] ?? 99) - (ROLE_HIERARCHY[b[0]] ?? 99)).map(([role, count]) => (
          <Badge key={role} variant="secondary" className="text-xs">{role}: {count}</Badge>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, username, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4" /> All Users — {sortedUsers.length} shown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedUsers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Username</th>
                    <th className="pb-3 pr-4">Discord ID</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Max Auto</th>
                    <th className="pb-3 pr-4">Last Login</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user, idx) => (
                    <tr key={user.discord_id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="py-2.5 pr-4 font-medium">{user.name || '—'}</td>
                      <td className="py-2.5 pr-4">{user.username || '—'}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{user.discord_id}</td>
                      <td className="py-2.5 pr-4">
                        {editingId === user.discord_id ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="rounded border border-border bg-secondary px-2 py-1 text-sm"
                          >
                            {Object.keys(ROLE_HIERARCHY).map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : getRoleBadge(user.role)}
                      </td>
                      <td className="py-2.5 pr-4">
                        {editingId === user.discord_id ? (
                          <Input
                            type="number"
                            value={editMaxAuto}
                            onChange={(e) => setEditMaxAuto(parseInt(e.target.value) || 0)}
                            className="w-20 h-8"
                          />
                        ) : (
                          <span className={user.max_auto >= 999 ? 'text-primary font-medium' : ''}>
                            {user.max_auto >= 999 ? 'INF' : user.max_auto}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                        {user.last_login ? new Date(user.last_login).toLocaleString('id-ID') : '—'}
                      </td>
                      <td className="py-2.5">
                        {editingId === user.discord_id ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => saveUser(user.discord_id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditing}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => startEditing(user)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
