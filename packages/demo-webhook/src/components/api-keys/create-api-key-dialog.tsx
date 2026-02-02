'use client';

import { useState } from 'react';
import { Plus, Key, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { CreateApiKeyResponse } from '@/types';

interface CreateApiKeyDialogProps {
  onCreated?: (apiKey: CreateApiKeyResponse) => void;
}

export function CreateApiKeyDialog({ onCreated }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to create API key');
      }

      const data: CreateApiKeyResponse = await response.json();
      setCreatedKey(data);
      onCreated?.(data);
      toast.success('API key created successfully');
    } catch (error) {
      toast.error('Failed to create API key');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (createdKey?.key) {
      await navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      toast.success('API key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setName('');
      setCreatedKey(null);
      setCopied(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {!createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Create New API Key
              </DialogTitle>
              <DialogDescription>
                Create an API key to authenticate webhook requests. The key will
                only be shown once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production, Development, Testing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <p className="text-xs text-muted-foreground">
                  Give your API key a descriptive name to identify it later.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isLoading || !name.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-500">
                <Check className="h-5 w-5" />
                API Key Created
              </DialogTitle>
              <DialogDescription>
                Copy this key now. You won&apos;t be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="relative">
                  <div
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg',
                      'bg-muted/50 border border-border/50',
                      'font-mono text-sm break-all'
                    )}
                  >
                    <code className="flex-1 text-primary">{createdKey.key}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-500">
                    <strong>Important:</strong> Store this key securely. It will
                    not be shown again.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Usage</Label>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
                    <span className="text-primary">curl</span> -X POST
                    http://localhost:3003/api/webhook \{'\n'}
                    {'  '}-H &quot;X-API-Key: {createdKey.key.substring(0, 8)}...&quot;
                    \{'\n'}
                    {'  '}-H &quot;Content-Type: application/json&quot; \{'\n'}
                    {'  '}-d {`'{"type":"test"}'`}
                  </pre>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
