'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Code, Webhook, Settings, ChevronRight } from 'lucide-react';

type DocSection = 'overview' | 'bot-api' | 'webhooks' | 'config';

const sections: { id: DocSection; title: string; icon: React.ReactNode }[] = [
  { id: 'overview', title: 'Overview', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'bot-api', title: 'Bot API', icon: <Code className="h-4 w-4" /> },
  { id: 'webhooks', title: 'Webhooks', icon: <Webhook className="h-4 w-4" /> },
  { id: 'config', title: 'Config Reference', icon: <Settings className="h-4 w-4" /> },
];

function DocContent({ section }: { section: DocSection }) {
  switch (section) {
    case 'overview':
      return (
        <div className="prose prose-invert max-w-none space-y-4">
          <h3 className="text-xl font-bold text-white">Fivem-Status — Developer Docs</h3>
          <p className="text-gray-300">
            Fivem-Status provides a bot management system, server monitoring, and webhook-based notifications
            for FiveM game servers. The backend API runs on port <code className="rounded bg-gray-800 px-1.5 py-0.5 text-sm text-green-400">34002</code>.
          </p>
          <h4 className="text-lg font-semibold text-white mt-6">Architecture</h4>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li><strong>Backend API</strong> — Node.js/Express server at <code className="rounded bg-gray-800 px-1.5 py-0.5 text-sm text-green-400">localhost:34002</code></li>
            <li><strong>Dashboard</strong> — Next.js frontend (this app)</li>
            <li><strong>Bot Runner</strong> — Child process manager for Discord/TS3 bots</li>
            <li><strong>Database</strong> — SQLite via <code className="rounded bg-gray-800 px-1.5 py-0.5 text-sm text-green-400">@fivem/db</code></li>
          </ul>
          <h4 className="text-lg font-semibold text-white mt-6">Quick Start</h4>
          <pre className="rounded-lg bg-gray-950 border border-gray-800 p-4 text-sm text-gray-300 overflow-x-auto">{`# Start backend
cd backend && npm run start

# Start dashboard
cd dashboard && npm run dev

# Bot process is managed via the dashboard UI or API`}</pre>
        </div>
      );

    case 'bot-api':
      return (
        <div className="prose prose-invert max-w-none space-y-4">
          <h3 className="text-xl font-bold text-white">Bot API Reference</h3>
          <p className="text-gray-300">Endpoints for managing bot instances.</p>

          <div className="space-y-6">
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-green-600 px-2 py-0.5 text-xs font-bold text-white">GET</span>
                <code className="text-sm text-green-400">/api/bots</code>
              </div>
              <p className="text-sm text-gray-400">List all registered bots.</p>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">POST</span>
                <code className="text-sm text-blue-400">/api/bots</code>
              </div>
              <p className="text-sm text-gray-400">Register a new bot.</p>
              <pre className="mt-2 rounded bg-gray-900 p-2 text-xs text-gray-300">{`{
  "name": "My Bot",
  "serverId": "guild-id",
  "token": "discord-bot-token"
}`}</pre>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">POST</span>
                <code className="text-sm text-blue-400">/api/bots/:id/start</code>
              </div>
              <p className="text-sm text-gray-400">Start a bot process.</p>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">POST</span>
                <code className="text-sm text-blue-400">/api/bots/:id/stop</code>
              </div>
              <p className="text-sm text-gray-400">Stop a running bot process.</p>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">DELETE</span>
                <code className="text-sm text-red-400">/api/bots/:id</code>
              </div>
              <p className="text-sm text-gray-400">Remove a bot registration and stop its process.</p>
            </div>
          </div>
        </div>
      );

    case 'webhooks':
      return (
        <div className="prose prose-invert max-w-none space-y-4">
          <h3 className="text-xl font-bold text-white">Webhook Configuration</h3>
          <p className="text-gray-300">
            Webhooks are used to send notifications to Discord channels when server status changes.
          </p>

          <h4 className="text-lg font-semibold text-white mt-6">Setup</h4>
          <ol className="list-decimal list-inside text-gray-300 space-y-1">
            <li>Create a Discord webhook in your server settings</li>
            <li>Add the webhook URL to your bot configuration</li>
            <li>Configure which events trigger notifications</li>
          </ol>

          <h4 className="text-lg font-semibold text-white mt-6">Event Types</h4>
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
            <pre className="text-sm text-gray-300">{`{
  "webhook_url": "https://discord.com/api/webhooks/...",
  "events": {
    "server_online": true,
    "server_offline": true,
    "player_joined": false,
    "player_left": false,
    "player_count_changed": true,
    "status_update_interval": 60
  }
}`}</pre>
          </div>

          <h4 className="text-lg font-semibold text-white mt-6">API</h4>
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded bg-green-600 px-2 py-0.5 text-xs font-bold text-white">GET</span>
              <code className="text-sm text-green-400">/api/webhooks</code>
            </div>
            <p className="text-sm text-gray-400">List all webhook configurations.</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">PUT</span>
              <code className="text-sm text-blue-400">/api/webhooks/:botId</code>
            </div>
            <p className="text-sm text-gray-400">Update webhook config for a bot.</p>
          </div>
        </div>
      );

    case 'config':
      return (
        <div className="prose prose-invert max-w-none space-y-4">
          <h3 className="text-xl font-bold text-white">Configuration Reference</h3>
          <p className="text-gray-300">Complete configuration options for Fivem-Status.</p>

          <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
            <pre className="text-sm text-gray-300 overflow-x-auto">{`{
  "port": 34002,
  "db_path": "./data/fivem-status.db",
  "log_level": "info",

  "defaults": {
    "auto_status_interval": 30,
    "max_bots_per_user": 5,
    "max_auto_queries": 100
  },

  "server_monitor": {
    "timeout_ms": 5000,
    "retry_count": 3,
    "retry_delay_ms": 2000
  },

  "bot_defaults": {
    "prefix": "!",
    "status_channel_id": null,
    "embed_color": "#5865F2"
  },

  "premium": {
    "enabled": false,
    "midtrans_key": "",
    "plans": {
      "free": { "max_bots": 2, "max_auto": 100 },
      "pro": { "max_bots": 10, "max_auto": 1000 },
      "enterprise": { "max_bots": 999, "max_auto": 99999 }
    }
  }
}`}</pre>
          </div>

          <h4 className="text-lg font-semibold text-white mt-6">Environment Variables</h4>
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
            <pre className="text-sm text-gray-300 overflow-x-auto">{`PORT=34002
DB_PATH=./data/fivem-status.db
DISCORD_TOKEN=your-bot-token
MIDTRANS_SERVER_KEY=your-server-key
MIDTRANS_CLIENT_KEY=your-client-key`}</pre>
          </div>
        </div>
      );
  }
}

export default function DevDocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>('overview');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          Developer Docs
        </h2>
        <p className="text-gray-400">API reference, webhooks, and configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {sections.map((s) => (
                <Button
                  key={s.id}
                  variant={activeSection === s.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection(s.id)}
                >
                  {s.icon}
                  <span className="ml-2">{s.title}</span>
                  {activeSection === s.id && <ChevronRight className="ml-auto h-4 w-4" />}
                </Button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <DocContent section={activeSection} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
