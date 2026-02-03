import { ApiProperty } from '@nestjs/swagger';
import bigintUtil from './bigint.util';

export class Response<T> {
  constructor(code = 200, msg?: string, data?: T) {
    this.code = code;
    this.msg = msg || 'ok';
    this.data = data || undefined;
  }

  @ApiProperty({ type: 'number', default: 200 })
  code: number;

  @ApiProperty({ type: 'string', default: 'ok' })
  msg?: string;

  @ApiProperty()
  data?: T;

  static ok<T>(data?: T): Response<T> {
    return new Response(200, 'ok', bigintUtil.serialize(data));
  }
}
