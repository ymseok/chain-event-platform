import { Interface, Log, LogDescription, InterfaceAbi } from 'ethers';
import { ParsedEventData } from '../types';

export class EventParser {
  private interfaceCache: Map<string, Interface> = new Map();

  /**
   * Get or create an Interface instance for the given ABI
   */
  private getInterface(abi: InterfaceAbi, cacheKey: string): Interface {
    if (!this.interfaceCache.has(cacheKey)) {
      this.interfaceCache.set(cacheKey, new Interface(abi));
    }
    return this.interfaceCache.get(cacheKey)!;
  }

  /**
   * Parse a log entry using the provided ABI
   */
  parseLog(log: Log, abi: InterfaceAbi, cacheKey: string): ParsedEventData | null {
    try {
      const iface = this.getInterface(abi, cacheKey);
      const parsed: LogDescription | null = iface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (!parsed) {
        return null;
      }

      // Convert args to a plain object with proper type handling
      const args: Record<string, unknown> = {};
      for (let i = 0; i < parsed.fragment.inputs.length; i++) {
        const input = parsed.fragment.inputs[i];
        const value = parsed.args[i];
        args[input.name] = this.convertValue(value);
      }

      return {
        name: parsed.name,
        signature: parsed.signature,
        args,
      };
    } catch (error) {
      // Log parsing failed - this can happen if the log doesn't match the ABI
      return null;
    }
  }

  /**
   * Convert ethers.js values to JSON-serializable format
   */
  private convertValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle BigInt
    if (typeof value === 'bigint') {
      return value.toString();
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((v) => this.convertValue(v));
    }

    // Handle objects (but not special ethers types)
    if (typeof value === 'object') {
      // Check if it's an ethers Result (array-like with named properties)
      if ('toArray' in value && typeof (value as { toArray: () => unknown[] }).toArray === 'function') {
        return (value as { toArray: () => unknown[] }).toArray().map((v) => this.convertValue(v));
      }

      // Regular object
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        // Skip numeric keys for Result objects
        if (!/^\d+$/.test(key)) {
          result[key] = this.convertValue(val);
        }
      }
      return result;
    }

    return value;
  }

  /**
   * Clear the interface cache
   */
  clearCache(): void {
    this.interfaceCache.clear();
  }
}
