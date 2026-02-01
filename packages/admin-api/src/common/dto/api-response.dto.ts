import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorResponse {
  @ApiProperty()
  code: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  details?: unknown;
}

export class ApiSuccessResponse<T> {
  @ApiProperty()
  success: true;

  @ApiProperty()
  data: T;
}

export class ApiFailureResponse {
  @ApiProperty()
  success: false;

  @ApiProperty()
  error: ApiErrorResponse;
}
