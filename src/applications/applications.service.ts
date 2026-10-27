import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './application.entity';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly appsRepo: Repository<Application>,
  ) {}

  async findAll(userId: number, page = 1, limit = 10) {
    const [items, total] = await this.appsRepo.findAndCount({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return { items, total, page, limit };
  }

  async create(userId: number, jobId: number) {
    const existing = await this.appsRepo.findOne({ where: { userId, jobId } });
    if (existing) {
      throw new Error('Application already exists');   // → 409
    }
    const app = this.appsRepo.create({ userId, jobId, status: 'new' });
    await this.appsRepo.save(app);
    return app;
  }
}