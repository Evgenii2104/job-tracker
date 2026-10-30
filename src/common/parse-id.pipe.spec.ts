import { ParseIdPipe } from './parse-id.pipe';
import { BadRequestException } from '@nestjs/common';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it('parses valid id', () => {
    expect(pipe.transform('123')).toBe(123);
  });

  it('rejects zero', () => {
    expect(() => pipe.transform('0')).toThrow(BadRequestException);
  });

  it('rejects negative', () => {
    expect(() => pipe.transform('-5')).toThrow(BadRequestException);
  });

  it('rejects non-integer', () => {
    expect(() => pipe.transform('1.5')).toThrow(BadRequestException);
  });

  it('rejects too large', () => {
    expect(() => pipe.transform('99999999999999999999')).toThrow(BadRequestException);
  });
});