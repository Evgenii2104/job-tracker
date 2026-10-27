import { Controller, Get, Post, Body, Query, Req, UnauthorizedException, ConflictException, HttpCode } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import type { Request } from 'express';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly appsService: ApplicationsService) {}

  @Get()
  async findAll(@Req() req: Request, @Query('page') page = '1', @Query('limit') limit = '10') {
    const userId = (req.session as any).userId;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    return this.appsService.findAll(userId, Number(page), Number(limit));
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: { jobId: string }, @Req() req: Request) {
    const userId = (req.session as any).userId;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    try {
      const app = await this.appsService.create(userId, Number(body.jobId));
      return { application: app };
    } catch (e: any) {
      if (e.message === 'Application already exists') {
        throw new ConflictException('Application already exists');
      }
      throw e;
    }
  }
}