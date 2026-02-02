'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WebhookEvent, SSEMessage } from '@/types';

const MAX_EVENTS = 100;
const RECONNECT_DELAY = 3000;

interface UseEventStreamReturn {
  events: WebhookEvent[];
  isConnected: boolean;
  isReconnecting: boolean;
  connectionError: string | null;
  clearEvents: () => void;
  eventCount: number;
}

export function useEventStream(): UseEventStreamReturn {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionError(null);
    const eventSource = new EventSource('/api/events');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionError(null);
    };

    eventSource.onmessage = (e) => {
      try {
        const data: SSEMessage = JSON.parse(e.data);

        if (data.type === 'init' && data.events) {
          setEvents(data.events.slice(0, MAX_EVENTS));
        } else if (data.type === 'event' && data.event) {
          setEvents((prev) => [data.event!, ...prev].slice(0, MAX_EVENTS));
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt to reconnect
      setIsReconnecting(true);
      setConnectionError('Connection lost. Reconnecting...');

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, RECONNECT_DELAY);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isConnected,
    isReconnecting,
    connectionError,
    clearEvents,
    eventCount: events.length,
  };
}
