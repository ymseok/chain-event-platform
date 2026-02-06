import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ActiveApplication {
  id: string;
  name: string;
}

@Injectable()
export class ApplicationRepository {
  private readonly logger = new Logger(ApplicationRepository.name);

  constructor(private prisma: PrismaService) {}

  async findAllActive(): Promise<ActiveApplication[]> {
    const applications = await this.prisma.application.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return applications;
  }

  async findById(id: string): Promise<ActiveApplication | null> {
    return this.prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });
  }
}
