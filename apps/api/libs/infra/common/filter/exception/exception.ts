import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';

import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { getReqMainInfo } from '@/utils/logger.util';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let msg =
      exception.message || (status >= 500 ? 'Service Error' : 'Client Error');
    if (
      Object.prototype.toString.call(response) === '[object Object]' &&
      response.message
    ) {
      msg = response.message;
    }

    this.logger.error(
      msg,
      getReqMainInfo(request, { ...response, statusCode: status }),
    );
    response.status(status).json({
      code: status,
      msg: `Service Error: ${exception}`,
    });
  }
}
