'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Wifi,
  WifiOff,
  Trash2,
  Filter,
  Radio,
  Terminal,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEventStream } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EventLogItem } from './event-log-item';

type FilterType = 'all' | 'test' | 'event';

export function EventLogViewer() {
  const { events, isConnected, isReconnecting, clearEvents, eventCount } =
    useEventStream();
  const [filter, setFilter] = useState<FilterType>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());

  // Track new events for animation
  useEffect(() => {
    if (events.length > 0) {
      const latestId = events[0].id;
      setNewEventIds((prev) => new Set([...prev, latestId]));

      // Clear new indicator after animation
      const timer = setTimeout(() => {
        setNewEventIds((prev) => {
          const next = new Set(prev);
          next.delete(latestId);
          return next;
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [events]);

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current && events.length > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true;
    return event.payload?.type === filter;
  });

  const filterCounts = {
    all: events.length,
    test: events.filter((e) => e.payload?.type === 'test').length,
    event: events.filter((e) => e.payload?.type === 'event').length,
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Header with connection status and controls */}
      <div className="flex-shrink-0 border-b border-border/30 bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center justify-between p-4">
          {/* Title and connection status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Terminal className="h-5 w-5 text-primary" />
                {isConnected && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Live Event Stream
                </h2>
                <p className="text-xs text-muted-foreground">
                  Real-time webhook monitoring
                </p>
              </div>
            </div>

            {/* Connection status indicator */}
            <ConnectionStatus
              isConnected={isConnected}
              isReconnecting={isReconnecting}
            />
          </div>

          {/* Event counter */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-xs gap-1.5 border-primary/30 text-primary"
            >
              <Activity className="h-3 w-3" />
              {eventCount} events
            </Badge>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1 p-1 rounded-lg bg-muted/30">
              {(['all', 'test', 'event'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                    filter === type
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                  <span className="ml-1.5 text-[10px] opacity-70">
                    ({filterCounts[type]})
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className={cn(
                'text-xs gap-1.5',
                autoScroll ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Radio className={cn('h-3 w-3', autoScroll && 'animate-pulse')} />
              Auto-scroll
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearEvents}
              disabled={events.length === 0}
              className="text-xs gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth"
      >
        {filteredEvents.length === 0 ? (
          <EmptyState filter={filter} isConnected={isConnected} />
        ) : (
          filteredEvents.map((event) => (
            <EventLogItem
              key={event.id}
              event={event}
              isNew={newEventIds.has(event.id)}
            />
          ))
        )}
      </div>

      {/* Footer with stream indicator */}
      <div className="flex-shrink-0 border-t border-border/30 px-4 py-2 bg-muted/20">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          <span>webhook://localhost:3003/api/webhook</span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              )}
            />
            <span>{isConnected ? 'streaming' : 'offline'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectionStatus({
  isConnected,
  isReconnecting,
}: {
  isConnected: boolean;
  isReconnecting: boolean;
}) {
  if (isReconnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30">
        <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />
        <span className="text-xs font-medium text-yellow-500">Reconnecting...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
        <Wifi className="h-3 w-3 text-emerald-500" />
        <span className="text-xs font-medium text-emerald-500">Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
      <WifiOff className="h-3 w-3 text-red-500" />
      <span className="text-xs font-medium text-red-500">Disconnected</span>
    </div>
  );
}

function EmptyState({
  filter,
  isConnected,
}: {
  filter: FilterType;
  isConnected: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
      {/* Animated radar effect */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full border border-border/50 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border border-border/30 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-primary/50 flex items-center justify-center">
              {isConnected ? (
                <Radio className="h-4 w-4 text-primary animate-pulse" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        {isConnected && (
          <div className="absolute inset-0 rounded-full border border-primary/20 animate-radar" />
        )}
      </div>

      <h3 className="text-lg font-semibold mb-2">
        {!isConnected
          ? 'Waiting for connection...'
          : filter !== 'all'
            ? `No ${filter} events`
            : 'Waiting for events...'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {!isConnected
          ? 'Establishing connection to the event stream'
          : filter !== 'all'
            ? `No ${filter} events have been received yet. Try changing the filter.`
            : 'Send a webhook request to see it appear here in real-time.'}
      </p>

      {isConnected && filter === 'all' && (
        <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/30 max-w-md">
          <p className="text-xs font-mono text-muted-foreground">
            <span className="text-primary">curl</span> -X POST
            http://localhost:3003/api/webhook \<br />
            {'  '}-H "Content-Type: application/json" \<br />
            {'  '}-H "X-API-Key: YOUR_API_KEY" \<br />
            {'  '}-d {`'{"type":"test","message":"Hello!"}'`}
          </p>
        </div>
      )}
    </div>
  );
}
