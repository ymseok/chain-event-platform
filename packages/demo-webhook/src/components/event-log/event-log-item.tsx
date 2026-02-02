'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Zap, FlaskConical, Clock, Key } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { WebhookEvent } from '@/types';

interface EventLogItemProps {
  event: WebhookEvent;
  isNew?: boolean;
}

export function EventLogItem({ event, isNew = false }: EventLogItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNewIndicator, setShowNewIndicator] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setShowNewIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const eventType = event.payload?.type || 'unknown';
  const isTestEvent = eventType === 'test';

  return (
    <div
      className={cn(
        'group relative rounded-lg border transition-all duration-300',
        'bg-gradient-to-r from-card/80 to-card/40',
        'hover:from-card hover:to-card/60',
        'border-border/30 hover:border-primary/30',
        showNewIndicator && 'animate-event-flash border-primary/50'
      )}
    >
      {/* Glow effect for new events */}
      {showNewIndicator && (
        <div className="absolute inset-0 -z-10 rounded-lg opacity-50 blur-xl bg-primary/20 animate-pulse" />
      )}

      {/* Scan line effect on hover */}
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent animate-scan" />
      </div>

      {/* Main content row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Expand icon */}
        <div className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>

        {/* Event type badge */}
        <div className="flex-shrink-0">
          {isTestEvent ? (
            <Badge
              variant="secondary"
              className={cn(
                'gap-1.5 font-mono text-[10px] uppercase tracking-wider',
                'bg-violet-500/10 text-violet-400 border border-violet-500/30',
                'hover:bg-violet-500/20'
              )}
            >
              <FlaskConical className="h-3 w-3" />
              test
            </Badge>
          ) : (
            <Badge
              className={cn(
                'gap-1.5 font-mono text-[10px] uppercase tracking-wider',
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
                'hover:bg-emerald-500/20'
              )}
            >
              <Zap className="h-3 w-3" />
              event
            </Badge>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Clock className="h-3 w-3" />
          <span>{formatDateTime(event.receivedAt)}</span>
        </div>

        {/* API Key prefix */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 font-mono">
          <Key className="h-3 w-3" />
          <span className="tracking-wider">{event.apiKeyPrefix}...</span>
        </div>

        {/* Message preview */}
        {event.payload?.message && (
          <div className="flex-1 truncate text-sm text-foreground/80 ml-2">
            {event.payload.message}
          </div>
        )}

        {/* New indicator pulse */}
        {showNewIndicator && (
          <div className="flex-shrink-0 relative">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          </div>
        )}
      </button>

      {/* Expanded JSON payload */}
      {isExpanded && (
        <div className="px-4 pb-4 animate-expand-down">
          <div className="relative rounded-lg overflow-hidden">
            {/* Terminal-style header */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border/30">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                payload.json
              </span>
            </div>

            {/* JSON content with syntax highlighting */}
            <div className="relative bg-muted/30 p-4 overflow-x-auto">
              {/* Subtle grid background */}
              <div className="absolute inset-0 bg-grid-dense opacity-30 pointer-events-none" />

              <pre className="relative font-mono text-xs leading-relaxed">
                <JsonSyntaxHighlight data={event.payload} />
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple JSON syntax highlighter component
function JsonSyntaxHighlight({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 2);

  // Apply syntax highlighting
  const highlighted = json
    .replace(/"([^"]+)":/g, '<span class="text-violet-400">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="text-emerald-400">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="text-cyan-400">$1</span>')
    .replace(/: (true|false)/g, ': <span class="text-yellow-400">$1</span>')
    .replace(/: (null)/g, ': <span class="text-red-400">$1</span>');

  return <code dangerouslySetInnerHTML={{ __html: highlighted }} />;
}
