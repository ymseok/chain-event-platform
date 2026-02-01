import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}

export class EntityNotFoundException extends BusinessException {
  constructor(entity: string, identifier?: string | number) {
    const message = identifier
      ? `${entity} with identifier '${identifier}' not found`
      : `${entity} not found`;
    super('ENTITY_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateEntityException extends BusinessException {
  constructor(entity: string, field?: string) {
    const message = field
      ? `${entity} with this ${field} already exists`
      : `${entity} already exists`;
    super('DUPLICATE_ENTITY', message, HttpStatus.CONFLICT);
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends BusinessException {
  constructor(message: string = 'Access denied') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

export class ValidationException extends BusinessException {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, details);
  }
}
