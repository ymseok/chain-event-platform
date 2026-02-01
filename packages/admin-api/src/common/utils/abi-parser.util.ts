import { Interface, EventFragment, InterfaceAbi } from 'ethers';

export interface ParsedEventParameter {
  name: string;
  type: string;
  indexed: boolean;
}

export interface ParsedEvent {
  name: string;
  signature: string;
  parameters: ParsedEventParameter[];
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
        events.push({
          name: event.name,
          signature: event.topicHash,
          parameters: event.inputs.map((input) => ({
            name: input.name,
            type: input.type,
            indexed: input.indexed ?? false,
          })),
        });
      });

      return events;
    } catch (error) {
      throw new Error(`Failed to parse ABI: ${(error as Error).message}`);
    }
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
