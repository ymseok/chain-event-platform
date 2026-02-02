import { EventEmitter } from 'events';
import type { WebhookEvent } from '@/types';

class EventStore {
  private events: WebhookEvent[] = [];
  private maxSize = 100;
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  addEvent(event: WebhookEvent): void {
    this.events.unshift(event);
    if (this.events.length > this.maxSize) {
      this.events.pop();
    }
    this.emitter.emit('event', event);
  }

  getRecentEvents(limit: number = 50): WebhookEvent[] {
    return this.events.slice(0, limit);
  }

  clearEvents(): void {
    this.events = [];
  }

  getEventCount(): number {
    return this.events.length;
  }

  onEvent(callback: (event: WebhookEvent) => void): () => void {
    this.emitter.on('event', callback);
    return () => this.emitter.off('event', callback);
  }
}

export const eventStore = new EventStore();
