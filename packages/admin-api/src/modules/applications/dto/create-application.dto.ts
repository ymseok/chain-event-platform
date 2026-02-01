import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ example: 'My DApp', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'A decentralized application for NFT trading' })
  @IsString()
  @IsOptional()
  description?: string;
}
