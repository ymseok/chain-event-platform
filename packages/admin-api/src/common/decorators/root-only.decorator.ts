import { applyDecorators, UseGuards } from '@nestjs/common';
import { RootGuard } from '../guards/root.guard';

export const RootOnly = () => applyDecorators(UseGuards(RootGuard));
