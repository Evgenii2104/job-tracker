import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './job.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
  ) {}

  async findAll(page = 1, limit = 10) {
    const [items, total] = await this.jobsRepo.findAndCount({
      select: { id: true, title: true, company: true, createdAt: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return { items, total, page, limit };
  }
}