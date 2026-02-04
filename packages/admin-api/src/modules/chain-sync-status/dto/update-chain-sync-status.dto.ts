import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateChainSyncStatusDto {
  @ApiProperty({ description: 'Latest synced block number', example: '12345678' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, { message: 'latestBlockNumber must be a numeric string' })
  latestBlockNumber: string;

  @ApiProperty({
    description: 'Sync status',
    enum: ['SYNCING', 'SYNCED', 'ERROR', 'STOPPED'],
    example: 'SYNCED',
  })
  @IsIn(['SYNCING', 'SYNCED', 'ERROR', 'STOPPED'])
  syncStatus: 'SYNCING' | 'SYNCED' | 'ERROR' | 'STOPPED';

  @ApiPropertyOptional({ description: 'Error message if sync failed' })
  @IsOptional()
  @IsString()
  lastError?: string;
}
