import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsUrl,
  IsInt,
  IsPositive,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateChainDto {
  @ApiProperty({ example: 'Ethereum Mainnet', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: 1, description: 'Blockchain network chain ID' })
  @IsInt()
  @IsPositive()
  chainId!: number;

  @ApiProperty({ example: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID' })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  rpcUrl!: string;

  @ApiPropertyOptional({
    example: 12,
    default: 12,
    minimum: 1,
    maximum: 3600,
    description: 'Average block time in seconds',
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(3600)
  blockTime?: number = 12;
}
