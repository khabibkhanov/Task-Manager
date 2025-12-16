import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL ?? 'postgresql://khabibkhanov:0130@localhost:5432/postgres';
    const adapter = new PrismaPg({ connectionString });
    super({ adapter } as any);
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch {
      // ignore connect errors (e.g., during tests without DATABASE_URL)
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
