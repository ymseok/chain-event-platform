import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
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
} from '../../common/exceptions/business.exception';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new DuplicateEntityException('User', 'email');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // First registered user becomes root
    const userCount = await this.usersService.count();
    if (userCount === 1) {
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
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
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
}
