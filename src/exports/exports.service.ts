import { Injectable,OnModuleDestroy, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Export } from './export.entity';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const exportsQueue = new Queue('exports', { connection });

@Injectable()
export class ExportsService implements OnModuleDestroy {
  constructor(
    @InjectRepository(Export)
    private readonly exportsRepo: Repository<Export>,
  ) {}

  async create(userId: number, format: string, idempotencyKey: string) {
    const existing = await this.exportsRepo.findOne({
      where: { userId, idempotencyKey },
    });
    if (existing) return existing;

    const exp = this.exportsRepo.create({
      userId, format, status: 'queued', idempotencyKey,
    });
    await this.exportsRepo.save(exp);

    await exportsQueue.add('generate', {
      exportId: exp.id, userId, format,
    });

    return exp;
  }

  async findOne(userId: number, id: number) {
    const exp = await this.exportsRepo.findOne({ where: { id, userId } });
    if (!exp) throw new NotFoundException('Not found');
    return exp;
  }

  async getFile(userId: number, id: number) {
    const exp = await this.findOne(userId, id);
    if (exp.status !== 'completed' || !exp.filePath) {
      throw new ConflictException('Export not ready');
    }
    return exp;
  }
  async onModuleDestroy() {
    await exportsQueue.close();
    await connection.quit();
  }
}