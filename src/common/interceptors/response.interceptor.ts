import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { map, Observable } from 'rxjs';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T | null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<ExpressResponse>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((result) => {
        if (result && typeof result === 'object' && 'message' in result) {
          const { message, ...rest } = result as { message: string; [key: string]: unknown };
          const data = 'data' in rest ? rest.data : Object.keys(rest).length > 0 ? rest : null;
          return { statusCode, message, data: data as T | null };
        }

        return { statusCode, message: 'Success', data: result ?? null };
      }),
    );
  }
}
