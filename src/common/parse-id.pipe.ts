import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0 || id > Number.MAX_SAFE_INTEGER) {
      throw new BadRequestException('Invalid ID');
    }
    return id;
  }
}