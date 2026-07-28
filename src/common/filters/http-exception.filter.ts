import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { Response } from 'express';
import { I18nValidationException } from 'nestjs-i18n';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...(error.children?.length ? flattenValidationErrors(error.children) : []),
  ]);
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.extractMessage(exception, statusCode);

    response.status(statusCode).json({ statusCode, message, data: null });
  }

  private extractMessage(exception: unknown, statusCode: HttpStatus): string | string[] {
    if (exception instanceof I18nValidationException) {
      return flattenValidationErrors(exception.errors);
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        return body;
      }
      if (typeof body === 'object' && body !== null && 'message' in body) {
        return (body as { message: string | string[] }).message;
      }
    }

    return statusCode === HttpStatus.INTERNAL_SERVER_ERROR
      ? 'Internal server error'
      : 'Unexpected error';
  }
}
