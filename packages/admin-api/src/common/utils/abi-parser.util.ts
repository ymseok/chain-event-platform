import { Interface, EventFragment, InterfaceAbi } from 'ethers';

export interface ParsedEvent {
  name: string;
  signature: string;
  parameters: string; // Format: "(address from, address to, uint256 value)"
}

export class AbiParserUtil {
  /**
   * Parse ABI and extract all events
   */
  static parseEvents(abi: InterfaceAbi): ParsedEvent[] {
    try {
      const iface = new Interface(abi);
      const events: ParsedEvent[] = [];

      iface.forEachEvent((event: EventFragment) => {
        // Convert parameters to string format: "(type1 name1, type2 name2, ...)"
        const parameterString = this.formatEventParameters(event);

        events.push({
          name: event.name,
          signature: event.topicHash,
          parameters: parameterString,
        });
      });

      return events;
    } catch (error) {
      throw new Error(`Failed to parse ABI: ${(error as Error).message}`);
    }
  }

  /**
   * Format event parameters as string
   * Example: "(address from, address to, uint256 value)"
   */
  private static formatEventParameters(event: EventFragment): string {
    const params = event.inputs
      .map((input) => `${input.type} ${input.name}`)
      .join(', ');
    return `(${params})`;
  }

  /**
   * Validate ABI format
   */
  static validateAbi(abi: unknown): boolean {
    if (!Array.isArray(abi)) {
      return false;
    }

    try {
      new Interface(abi as InterfaceAbi);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get event count from ABI
   */
  static getEventCount(abi: InterfaceAbi): number {
    try {
      const iface = new Interface(abi);
      let count = 0;
      iface.forEachEvent(() => {
        count++;
      });
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Check if ABI has any events
   */
  static hasEvents(abi: InterfaceAbi): boolean {
    return AbiParserUtil.getEventCount(abi) > 0;
  }
}
