import { Subscription } from '../types';

/**
 * Pre-indexed subscription lookup structure.
 * Replaces O(L×S) linear scan with O(1) Map lookup per log entry.
 *
 * Key format: "address:topic0" (both lowercased at build time).
 */
export class SubscriptionIndex {
  private index = new Map<string, Subscription[]>();

  private static makeKey(address: string, topic0: string): string {
    return `${address.toLowerCase()}:${topic0}`;
  }

  /**
   * Rebuild the index from a full subscription list.
   * Call this whenever subscriptions change.
   */
  build(subscriptions: Subscription[]): void {
    this.index.clear();
    for (const sub of subscriptions) {
      const key = SubscriptionIndex.makeKey(sub.contractAddress, sub.eventSignature);
      const bucket = this.index.get(key);
      if (bucket) {
        bucket.push(sub);
      } else {
        this.index.set(key, [sub]);
      }
    }
  }

  /**
   * O(1) lookup: return all subscriptions matching a log's address + topic0.
   */
  lookup(address: string, topic0: string): Subscription[] {
    return this.index.get(SubscriptionIndex.makeKey(address, topic0)) || [];
  }

  get size(): number {
    return this.index.size;
  }
}
