import { SetMetadata } from '@nestjs/common';

export const IS_INTERNAL_KEY = 'isInternal';
export const InternalOnly = () => SetMetadata(IS_INTERNAL_KEY, true);
