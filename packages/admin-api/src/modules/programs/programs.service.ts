import { Injectable } from '@nestjs/common';
import { AppRole, Prisma } from '@prisma/client';
import { InterfaceAbi, JsonRpcProvider } from 'ethers';
import { ProgramsRepository } from './programs.repository';
import { ApplicationsService } from '../applications/applications.service';
import { ChainsService } from '../chains/chains.service';
import { EventsService } from '../events/events.service';
import { RedisPublisherService } from '../../redis';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import {
  VerifyContractDto,
  ContractVerificationResultDto,
  ContractVerificationStatus,
} from './dto/verify-contract.dto';
import { ProgramResponseDto, ProgramDetailResponseDto } from './dto/program-response.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';
import { AbiParserUtil } from '../../common/utils';
import {
  EntityNotFoundException,
  DuplicateEntityException,
  ValidationException,
} from '../../common/exceptions';

@Injectable()
export class ProgramsService {
  constructor(
    private readonly programsRepository: ProgramsRepository,
    private readonly applicationsService: ApplicationsService,
    private readonly chainsService: ChainsService,
    private readonly eventsService: EventsService,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  async create(
    userId: string,
    applicationId: string,
    createDto: CreateProgramDto,
    isRoot: boolean = false,
  ): Promise<ProgramResponseDto> {
    await this.applicationsService.validateAccess(userId, applicationId, AppRole.MEMBER, isRoot);

    const chain = await this.chainsService.findById(createDto.chainId);
    if (!chain) {
      throw new EntityNotFoundException('Chain', createDto.chainId);
    }

    // Parse ABI from JSON string
    let parsedAbi: InterfaceAbi;
    try {
      parsedAbi = JSON.parse(createDto.abi);
    } catch {
      throw new ValidationException('Invalid ABI JSON format');
    }

    if (!AbiParserUtil.validateAbi(parsedAbi)) {
      throw new ValidationException('Invalid ABI format');
    }

    let program;
    try {
      program = await this.programsRepository.create({
        applicationId,
        chainId: createDto.chainId,
        name: createDto.name,
        contractAddress: createDto.contractAddress.toLowerCase(),
        abi: parsedAbi as object,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DuplicateEntityException(
          'Program',
          'chain and contract address combination',
        );
      }
      throw error;
    }

    // Parse ABI and create events
    const parsedEvents = AbiParserUtil.parseEvents(parsedAbi);
    await this.eventsService.createMany(program.id, parsedEvents);

    // Publish config refresh signal
    await this.redisPublisher.publishProgramCreated();

    return ProgramResponseDto.fromEntity(program);
  }

  async findAllByApplicationId(
    userId: string,
    applicationId: string,
    pagination: PaginationQueryDto,
    isRoot: boolean = false,
  ): Promise<PaginatedResponseDto<ProgramResponseDto>> {
    await this.applicationsService.validateAccess(userId, applicationId, AppRole.GUEST, isRoot);

    const [programs, total] = await this.programsRepository.findAllByApplicationId(
      applicationId,
      pagination.skip,
      pagination.take,
    );

    return PaginatedResponseDto.create(programs.map(ProgramResponseDto.fromEntity), {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total,
    });
  }

  async findOne(userId: string, id: string, isRoot: boolean = false): Promise<ProgramDetailResponseDto> {
    const program = await this.programsRepository.findByIdWithEvents(id);
    if (!program) {
      throw new EntityNotFoundException('Program', id);
    }

    await this.applicationsService.validateAccess(userId, program.applicationId, AppRole.GUEST, isRoot);
    return ProgramDetailResponseDto.fromEntity(program);
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateProgramDto,
    isRoot: boolean = false,
  ): Promise<ProgramResponseDto> {
    const program = await this.programsRepository.findById(id);
    if (!program) {
      throw new EntityNotFoundException('Program', id);
    }

    await this.applicationsService.validateAccess(userId, program.applicationId, AppRole.MEMBER, isRoot);

    let parsedAbi: InterfaceAbi | undefined;
    if (updateDto.abi) {
      let abi: InterfaceAbi;
      try {
        abi = JSON.parse(updateDto.abi);
      } catch {
        throw new ValidationException('Invalid ABI JSON format');
      }

      if (!AbiParserUtil.validateAbi(abi)) {
        throw new ValidationException('Invalid ABI format');
      }

      // Sync events with new ABI
      const newEvents = AbiParserUtil.parseEvents(abi);
      await this.eventsService.syncEvents(program.id, newEvents);
      parsedAbi = abi;
    }

    const updated = await this.programsRepository.update(id, {
      name: updateDto.name,
      status: updateDto.status as 'ACTIVE' | 'INACTIVE' | undefined,
      ...(parsedAbi && { abi: parsedAbi as object }),
    });

    // Publish config refresh signal
    await this.redisPublisher.publishProgramUpdated();

    return ProgramResponseDto.fromEntity(updated);
  }

  async remove(userId: string, id: string, isRoot: boolean = false): Promise<void> {
    const program = await this.programsRepository.findById(id);
    if (!program) {
      throw new EntityNotFoundException('Program', id);
    }

    await this.applicationsService.validateAccess(userId, program.applicationId, AppRole.MEMBER, isRoot);
    await this.programsRepository.delete(id);

    // Publish config refresh signal
    await this.redisPublisher.publishProgramDeleted();
  }

  async toggleStatus(userId: string, id: string, isRoot: boolean = false): Promise<ProgramResponseDto> {
    const program = await this.programsRepository.findById(id);
    if (!program) {
      throw new EntityNotFoundException('Program', id);
    }

    await this.applicationsService.validateAccess(userId, program.applicationId, AppRole.MEMBER, isRoot);

    const newStatus = program.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await this.programsRepository.update(id, { status: newStatus });

    // Publish config refresh signal
    await this.redisPublisher.publishProgramUpdated();

    return ProgramResponseDto.fromEntity(updated);
  }

  async verifyContract(dto: VerifyContractDto): Promise<ContractVerificationResultDto> {
    const chain = await this.chainsService.findById(dto.chainId);
    if (!chain) {
      throw new EntityNotFoundException('Chain', dto.chainId);
    }

    const result: ContractVerificationResultDto = {
      status: ContractVerificationStatus.NO_CONTRACT,
      contractExists: false,
      bytecodeChecked: false,
      bytecodeMatch: null,
      onChainBytecodeSize: null,
      message: '',
      chainName: chain.name,
      warnings: [],
    };

    if (!chain.enabled) {
      result.status = ContractVerificationStatus.RPC_ERROR;
      result.message = `Chain "${chain.name}" is currently disabled`;
      return result;
    }

    let onChainBytecode: string;
    try {
      const provider = new JsonRpcProvider(chain.rpcUrl);
      onChainBytecode = await provider.getCode(dto.contractAddress);
    } catch (error) {
      result.status = ContractVerificationStatus.RPC_ERROR;
      result.message = `RPC connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return result;
    }

    if (onChainBytecode === '0x') {
      result.status = ContractVerificationStatus.NO_CONTRACT;
      result.message = `No contract found at address ${dto.contractAddress}`;
      return result;
    }

    result.contractExists = true;
    // bytecode size in bytes = (hex length - 2 for '0x' prefix) / 2
    result.onChainBytecodeSize = (onChainBytecode.length - 2) / 2;

    // EIP-1167 minimal proxy detection
    const EIP_1167_PREFIX = '0x363d3d373d3d3d363d73';
    const EIP_1167_SUFFIX = '5af43d82803e903d91602b57fd5bf3';
    if (
      onChainBytecode.toLowerCase().startsWith(EIP_1167_PREFIX) &&
      onChainBytecode.toLowerCase().endsWith(EIP_1167_SUFFIX)
    ) {
      result.warnings.push(
        'Contract appears to be an EIP-1167 minimal proxy. ABI should match the implementation contract.',
      );
    }

    if (!dto.deployedBytecode) {
      result.status = ContractVerificationStatus.CONTRACT_EXISTS;
      result.message = `Contract exists at ${dto.contractAddress} (${result.onChainBytecodeSize} bytes)`;
      return result;
    }

    result.bytecodeChecked = true;
    const onChainLower = onChainBytecode.toLowerCase();
    const providedLower = dto.deployedBytecode.toLowerCase();

    if (onChainLower === providedLower) {
      result.status = ContractVerificationStatus.VERIFIED;
      result.bytecodeMatch = true;
      result.message = 'Bytecode matches exactly';
      return result;
    }

    if (onChainLower.startsWith(providedLower) || providedLower.startsWith(onChainLower)) {
      result.status = ContractVerificationStatus.VERIFIED;
      result.bytecodeMatch = true;
      result.message = 'Bytecode matches (partial match detected)';
      result.warnings.push(
        'Bytecode matched via prefix comparison. Difference may be due to constructor arguments or immutable variables.',
      );
      return result;
    }

    result.status = ContractVerificationStatus.BYTECODE_MISMATCH;
    result.bytecodeMatch = false;
    result.message = 'Bytecode does not match the on-chain contract';
    return result;
  }
}
