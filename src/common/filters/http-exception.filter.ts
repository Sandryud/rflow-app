import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const exceptionResponse = exception.getResponse();

    const responseBody =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as { message?: string | string[]; error?: string })
        : undefined;

    const message = responseBody?.message ?? exception.message;
    const error = responseBody?.error ?? exception.name;

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
