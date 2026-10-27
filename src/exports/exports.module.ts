import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Export } from './export.entity';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Export])],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}