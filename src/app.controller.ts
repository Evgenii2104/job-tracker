import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
              @InjectDataSource() private readonly dataSource: DataSource,
              ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('status')
  getStatus(): string {
    return this.appService.getStatus();
  }

  @Get('health')
  async health() {
    const result = await this.dataSource.query('SELECT now() AS database_time');
    return {
      status: 'ok',
      databaseTime: result[0].database_time,
    };
  }

}
