import { Injectable } from '@nestjs/common';
import { ApiKeysRepository } from './api-keys.repository';
import { ApplicationsService } from '../applications/applications.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyResponseDto, ApiKeyCreatedResponseDto } from './dto/api-key-response.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';
import { CryptoUtil } from '../../common/utils';
import { EntityNotFoundException, ForbiddenException } from '../../common/exceptions';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly applicationsService: ApplicationsService,
  ) {}

  async create(
    userId: string,
    applicationId: string,
    createDto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedResponseDto> {
    await this.applicationsService.validateOwnership(userId, applicationId);

    const rawKey = CryptoUtil.generateApiKey();
    const keyHash = CryptoUtil.sha256Hash(rawKey);
    const keyPrefix = CryptoUtil.getKeyPrefix(rawKey);

    const apiKey = await this.apiKeysRepository.create({
      applicationId,
      name: createDto.name,
      keyHash,
      keyPrefix,
      expiresAt: createDto.expiresAt,
    });

    return {
      ...ApiKeyResponseDto.fromEntity(apiKey),
      key: rawKey, // Only returned once at creation
    };
  }

  async findAllByApplicationId(
    userId: string,
    applicationId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ApiKeyResponseDto>> {
    await this.applicationsService.validateOwnership(userId, applicationId);

    const [apiKeys, total] = await this.apiKeysRepository.findAllByApplicationId(
      applicationId,
      paginationQuery.skip,
      paginationQuery.take,
    );
    return PaginatedResponseDto.create(apiKeys.map(ApiKeyResponseDto.fromEntity), {
      page: paginationQuery.page!,
      limit: paginationQuery.limit!,
      total,
    });
  }

  async revoke(userId: string, id: string): Promise<void> {
    const apiKey = await this.apiKeysRepository.findById(id);
    if (!apiKey) {
      throw new EntityNotFoundException('ApiKey', id);
    }

    await this.applicationsService.validateOwnership(userId, apiKey.applicationId);
    await this.apiKeysRepository.revoke(id);
  }

  async validateApiKey(key: string): Promise<{ applicationId: string } | null> {
    const keyHash = CryptoUtil.sha256Hash(key);
    const apiKey = await this.apiKeysRepository.findByKeyHash(keyHash);

    if (!apiKey || apiKey.revokedAt) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    await this.apiKeysRepository.updateLastUsed(apiKey.id);
    return { applicationId: apiKey.applicationId };
  }
}
