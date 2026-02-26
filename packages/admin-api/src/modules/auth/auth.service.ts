import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ProfileDto } from './dto/profile.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import {
  UnauthorizedException,
  DuplicateEntityException,
  EntityNotFoundException,
  ForbiddenException,
} from '../../common/exceptions/business.exception';
import { REDIS_CLIENT } from '../../redis/redis.constants';

@Injectable()
export class AuthService {
  private static readonly TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const registrationMode = this.configService.get<string>(
      'registrationMode',
      'open',
    );

    // Check registration mode before proceeding
    const userCount = await this.usersService.count();
    const isFirstUser = userCount === 0;

    if (!isFirstUser) {
      if (registrationMode === 'closed') {
        throw new ForbiddenException('Registration is currently closed');
      }

      if (registrationMode === 'invite-only') {
        if (!registerDto.inviteToken) {
          throw new ForbiddenException(
            'Invite token is required for registration',
          );
        }
        // Validate invite token against configured secret
        const inviteSecret = this.configService.get<string>(
          'REGISTRATION_INVITE_SECRET',
        );
        if (!inviteSecret || registerDto.inviteToken !== inviteSecret) {
          throw new ForbiddenException('Invalid invite token');
        }
      }
    }

    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new DuplicateEntityException('User', 'email');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
    });

    // First registered user becomes root (race condition: check count before creation)
    if (isFirstUser) {
      await this.usersService.setRoot(user.id, true);
    }

    return this.generateTokens(user.id, user.email);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Check blacklist before verifying
      if (await this.isTokenBlacklisted(refreshToken)) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Blacklist the used refresh token (token rotation)
      await this.blacklistToken(refreshToken);

      return this.generateTokens(user.id, user.email);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await this.blacklistToken(refreshToken);
  }

  async validateUser(
    payload: JwtPayload,
  ): Promise<{ id: string; email: string; isRoot: boolean } | null> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      return null;
    }
    return { id: user.id, email: user.email, isRoot: user.isRoot };
  }

  async getProfile(userId: string): Promise<ProfileDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isRoot: user.isRoot,
      createdAt: user.createdAt,
    };
  }

  private generateTokens(userId: string, email: string): AuthResponseDto {
    const payload: JwtPayload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '15m',
    };
  }

  private async blacklistToken(token: string): Promise<void> {
    const hash = createHash('sha256').update(token).digest('hex');
    const key = `${AuthService.TOKEN_BLACKLIST_PREFIX}${hash}`;
    // TTL matches refresh token expiry (default 7d = 604800s)
    const ttlSeconds = this.parseExpiryToSeconds(
      this.configService.get<string>('jwt.refreshExpiresIn', '7d'),
    );
    await this.redis.set(key, '1', 'EX', ttlSeconds);
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const hash = createHash('sha256').update(token).digest('hex');
    const key = `${AuthService.TOKEN_BLACKLIST_PREFIX}${hash}`;
    const result = await this.redis.exists(key);
    return result === 1;
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 604800; // default 7 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 604800;
    }
  }
}
