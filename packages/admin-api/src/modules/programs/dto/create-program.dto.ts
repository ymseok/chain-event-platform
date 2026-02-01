import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsInt, IsArray, Matches } from 'class-validator';

export class CreateProgramDto {
  @ApiProperty({ example: 'USDT Contract' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  chainId!: number;

  @ApiProperty({ example: '0xdAC17F958D2ee523a2206206994597C13D831ec7' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address format' })
  contractAddress!: string;

  @ApiProperty({ type: 'array', example: [{ type: 'event', name: 'Transfer', inputs: [] }] })
  @IsArray()
  @IsNotEmpty()
  abi!: unknown[];
}
