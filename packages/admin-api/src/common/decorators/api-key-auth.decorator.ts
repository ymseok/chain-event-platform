import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

export const API_KEY_AUTH_KEY = 'apiKeyAuth';

export const ApiKeyAuth = () =>
  applyDecorators(SetMetadata(API_KEY_AUTH_KEY, true), ApiSecurity('api-key'));
