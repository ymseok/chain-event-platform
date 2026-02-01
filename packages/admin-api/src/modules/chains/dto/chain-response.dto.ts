import { ApiProperty } from '@nestjs/swagger';
import { Chain } from '@prisma/client';

export class ChainResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  chainId: number;

  @ApiProperty()
  status: string;

  static fromEntity(entity: Chain): ChainResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      chainId: entity.chainId,
      status: entity.status,
    };
  }
}
