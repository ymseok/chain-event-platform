import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { IS_INTERNAL_KEY } from '../decorators/internal-only.decorator';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isInternal = this.reflector.getAllAndOverride<boolean>(
      IS_INTERNAL_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isInternal) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-internal-key'];
    const expectedKey = this.configService.get<string>('internalApiKey');

    if (!providedKey || !expectedKey) {
      throw new UnauthorizedException('Internal API key required');
    }

    const providedBuf = Buffer.from(providedKey, 'utf-8');
    const expectedBuf = Buffer.from(expectedKey, 'utf-8');

    if (
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
