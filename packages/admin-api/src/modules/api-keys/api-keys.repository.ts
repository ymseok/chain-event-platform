import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApiKey } from '@prisma/client';

interface CreateApiKeyData {
  applicationId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  expiresAt?: Date;
}

@Injectable()
export class ApiKeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateApiKeyData): Promise<ApiKey> {
    return this.prisma.apiKey.create({ data });
  }

  async findById(id: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({ where: { id } });
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({ where: { keyHash } });
  }

  async findAllByApplicationId(applicationId: string): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}
