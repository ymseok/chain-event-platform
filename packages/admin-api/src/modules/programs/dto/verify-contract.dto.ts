import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class VerifyContractDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  chainId!: number;

  @ApiProperty({ example: '0xdAC17F958D2ee523a2206206994597C13D831ec7' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address format' })
  contractAddress!: string;

  @ApiPropertyOptional({
    description: 'Deployed bytecode as 0x hex string for verification',
    example: '0x6080604052...',
  })
  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]*$/, { message: 'Invalid bytecode hex format' })
  deployedBytecode?: string;
}

export enum ContractVerificationStatus {
  VERIFIED = 'VERIFIED',
  CONTRACT_EXISTS = 'CONTRACT_EXISTS',
  NO_CONTRACT = 'NO_CONTRACT',
  BYTECODE_MISMATCH = 'BYTECODE_MISMATCH',
  RPC_ERROR = 'RPC_ERROR',
}

export class ContractVerificationResultDto {
  @ApiProperty({ enum: ContractVerificationStatus })
  status!: ContractVerificationStatus;

  @ApiProperty()
  contractExists!: boolean;

  @ApiProperty()
  bytecodeChecked!: boolean;

  @ApiProperty({ type: Boolean, nullable: true })
  bytecodeMatch!: boolean | null;

  @ApiProperty({ type: Number, nullable: true })
  onChainBytecodeSize!: number | null;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  chainName!: string;

  @ApiProperty({ type: [String] })
  warnings!: string[];
}
