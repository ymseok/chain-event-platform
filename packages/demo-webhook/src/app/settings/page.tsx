'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Key,
  Webhook,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateApiKeyDialog, ApiKeyList } from '@/components/api-keys';

export default function SettingsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const webhookEndpoint = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook`
    : 'http://localhost:3003/api/webhook';

  const handleCopyEndpoint = async () => {
    await navigator.clipboard.writeText(webhookEndpoint);
    setCopiedEndpoint(true);
    toast.success('Endpoint URL copied');
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Main content */}
      <div className="relative">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Settings</h1>
                <p className="text-xs text-muted-foreground">
                  Manage API keys and webhook configuration
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="container mx-auto px-6 py-6 max-w-4xl space-y-6">
          {/* API Keys Section */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage authentication keys for webhook requests
                  </CardDescription>
                </div>
              </div>
              <CreateApiKeyDialog
                onCreated={() => setRefreshTrigger((prev) => prev + 1)}
              />
            </CardHeader>
            <CardContent>
              <ApiKeyList refreshTrigger={refreshTrigger} />
            </CardContent>
          </Card>

          {/* Webhook Configuration Section */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Webhook className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle>Webhook Configuration</CardTitle>
                  <CardDescription>
                    Endpoint information for Chain Event Platform
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Endpoint URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Endpoint URL</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <code className="flex-1 font-mono text-sm text-primary break-all">
                      {webhookEndpoint}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={handleCopyEndpoint}
                    >
                      {copiedEndpoint ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Required Headers */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Required Headers</label>
                <div className="rounded-lg bg-muted/30 border border-border/30 overflow-hidden">
                  <div className="grid grid-cols-2 text-xs font-medium text-muted-foreground border-b border-border/30">
                    <div className="px-4 py-2">Header</div>
                    <div className="px-4 py-2">Value</div>
                  </div>
                  <div className="grid grid-cols-2 text-sm border-b border-border/30">
                    <div className="px-4 py-3 font-mono text-violet-400">
                      X-API-Key
                    </div>
                    <div className="px-4 py-3 text-muted-foreground">
                      Your generated API key
                    </div>
                  </div>
                  <div className="grid grid-cols-2 text-sm">
                    <div className="px-4 py-3 font-mono text-violet-400">
                      Content-Type
                    </div>
                    <div className="px-4 py-3 font-mono text-muted-foreground">
                      application/json
                    </div>
                  </div>
                </div>
              </div>

              {/* Example Request */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Example Request</label>
                <div className="relative rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border/30">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      terminal
                    </span>
                  </div>
                  <div className="p-4 bg-muted/30 overflow-x-auto">
                    <pre className="font-mono text-xs leading-relaxed">
                      <span className="text-emerald-400">curl</span>
                      {' '}-X POST {webhookEndpoint} \{'\n'}
                      {'  '}-H <span className="text-yellow-400">&quot;Content-Type: application/json&quot;</span> \{'\n'}
                      {'  '}-H <span className="text-yellow-400">&quot;X-API-Key: YOUR_API_KEY&quot;</span> \{'\n'}
                      {'  '}-d <span className="text-cyan-400">{`'{"type":"test","message":"Hello from webhook!"}'`}</span>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="flex gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200/80">
                  <p className="font-medium text-blue-400 mb-1">
                    Register this URL in Chain Event Platform
                  </p>
                  <p>
                    Use this endpoint URL when creating a webhook subscription in
                    the Chain Event Platform admin panel. Events matching your
                    subscription criteria will be delivered here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
