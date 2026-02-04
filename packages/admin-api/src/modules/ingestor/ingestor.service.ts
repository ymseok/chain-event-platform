import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  IngestorChainDto,
  IngestorSubscriptionDto,
  IngestorSubscriptionsResponseDto,
} from './dto';

@Injectable()
export class IngestorService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscriptions(): Promise<IngestorSubscriptionsResponseDto> {
    // Get all active chains
    const chains = await this.prisma.chain.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { id: 'asc' },
    });

    // Get all active subscriptions with related data
    const subscriptions = await this.prisma.eventSubscription.findMany({
      where: {
        status: 'ACTIVE',
        event: {
          program: {
            status: 'ACTIVE',
            chain: {
              status: 'ACTIVE',
            },
          },
        },
        webhook: {
          status: 'ACTIVE',
          application: {
            status: 'ACTIVE',
          },
        },
      },
      include: {
        event: {
          include: {
            program: {
              include: {
                chain: true,
              },
            },
          },
        },
        webhook: true,
      },
    });

    const chainDtos: IngestorChainDto[] = chains.map((chain) => ({
      id: chain.id,
      chainId: chain.chainId,
      name: chain.name,
      rpcUrl: chain.rpcUrl,
      blockTime: chain.blockTime,
      status: chain.status,
    }));

    const subscriptionDtos: IngestorSubscriptionDto[] = subscriptions.map((sub) => ({
      id: sub.id,
      eventSignature: sub.event.signature,
      eventName: sub.event.name,
      contractAddress: sub.event.program.contractAddress,
      chainId: sub.event.program.chainId,
      networkChainId: sub.event.program.chain.chainId,
      applicationId: sub.webhook.applicationId,
      webhookId: sub.webhookId,
      filterConditions: sub.filterConditions,
      abi: sub.event.program.abi,
      eventParameters: sub.event.parameters,
    }));

    return {
      chains: chainDtos,
      subscriptions: subscriptionDtos,
    };
  }

  async getSubscriptionsByChainId(
    chainId: number,
  ): Promise<IngestorSubscriptionDto[]> {
    const subscriptions = await this.prisma.eventSubscription.findMany({
      where: {
        status: 'ACTIVE',
        event: {
          program: {
            chainId,
            status: 'ACTIVE',
          },
        },
        webhook: {
          status: 'ACTIVE',
          application: {
            status: 'ACTIVE',
          },
        },
      },
      include: {
        event: {
          include: {
            program: {
              include: {
                chain: true,
              },
            },
          },
        },
        webhook: true,
      },
    });

    return subscriptions.map((sub) => ({
      id: sub.id,
      eventSignature: sub.event.signature,
      eventName: sub.event.name,
      contractAddress: sub.event.program.contractAddress,
      chainId: sub.event.program.chainId,
      networkChainId: sub.event.program.chain.chainId,
      applicationId: sub.webhook.applicationId,
      webhookId: sub.webhookId,
      filterConditions: sub.filterConditions,
      abi: sub.event.program.abi,
      eventParameters: sub.event.parameters,
    }));
  }
}
