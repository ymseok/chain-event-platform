import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChainsService } from './chains.service';
import { ChainResponseDto } from './dto/chain-response.dto';

@ApiTags('Chains')
@ApiBearerAuth()
@Controller('chains')
export class ChainsController {
  constructor(private readonly chainsService: ChainsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all supported blockchain networks' })
  @ApiResponse({ status: 200, description: 'List of chains', type: [ChainResponseDto] })
  async findAll(): Promise<ChainResponseDto[]> {
    return this.chainsService.findAll();
  }
}
