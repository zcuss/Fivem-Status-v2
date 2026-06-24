'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RefreshCw, Users, Shield, Edit2, Save, X } from 'lucide-react';

const API_BASE = 'http://localhost:34002';

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

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function startEditing(user: User) {
    setEditingId(user.discord_id);
    setEditRole(user.role);
    setEditMaxAuto(user.max_auto);
  }

  function cancelEditing() {
    setEditingId(null);
  }

  async function saveUser(discordId: string) {
    try {
      await fetch(`${API_BASE}/api/users/${discordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, max_auto: editMaxAuto }),
      });
      setEditingId(null);
      fetchUsers();
    } catch (e) {
      console.error('Failed to update user:', e);
    }
  }

  function getRoleBadge(role: string) {
    switch (role) {
      case 'dev': return <Badge variant="destructive">{role}</Badge>;
      case 'admin': return <Badge variant="warning">{role}</Badge>;
      default: return <Badge variant="secondary">{role}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8" />
            Users
          </h2>
          <p className="text-gray-400">Manage user accounts and permissions</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Dev-only panel — {users.length} users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-gray-400">
                    <th className="pb-3 pr-4">Discord ID</th>
                    <th className="pb-3 pr-4">Username</th>
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Max Auto</th>
                    <th className="pb-3 pr-4">Last Login</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.discord_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-3 pr-4 font-mono text-xs">{user.discord_id}</td>
                      <td className="py-3 pr-4">{user.username}</td>
                      <td className="py-3 pr-4">{user.name}</td>
                      <td className="py-3 pr-4">
                        {editingId === user.discord_id ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                            <option value="dev">dev</option>
                          </select>
                        ) : (
                          getRoleBadge(user.role)
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {editingId === user.discord_id ? (
                          <Input
                            type="number"
                            value={editMaxAuto}
                            onChange={(e) => setEditMaxAuto(parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        ) : (
                          user.max_auto
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : '—'}
                      </td>
                      <td className="py-3">
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
