import {
  Controller, Post, Get, Body, Param, Req, Headers,
  UnauthorizedException, Res, HttpCode,
} from '@nestjs/common';
import { ExportsService } from './exports.service';
import type { Request, Response } from 'express';

@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post()
  @HttpCode(202)
  async create(
    @Body() body: { format?: string },
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: Request,
  ) {
    const userId = (req.session as any).userId;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    if (!idempotencyKey) throw new UnauthorizedException('Idempotency-Key required');
    const format = body.format ?? 'csv';
    if (format !== 'csv') throw new UnauthorizedException('Only csv supported');

    const exp = await this.exportsService.create(userId, format, idempotencyKey);
    return { export: { id: String(exp.id), status: exp.status } };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.session as any).userId;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    const exp = await this.exportsService.findOne(userId, Number(id));
    return { export: { id: String(exp.id), status: exp.status, progress: exp.progress } };
  }

  @Get(':id/file')
  async getFile(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const userId = (req.session as any).userId;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    const exp = await this.exportsService.getFile(userId, Number(id));
    const exportsRoot = process.env.EXPORTS_ROOT
      ?? '/Users/evgeniigaivoronskii/Desktop/Project/job-tracker/job-tracker';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="applications-${exp.id}.csv"`);
    res.sendFile(exp.filePath!, { root: exportsRoot });
  }
}
