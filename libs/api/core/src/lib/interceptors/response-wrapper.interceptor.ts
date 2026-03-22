import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

interface PaginatedResult {
  items: unknown[];
  total: number;
  page?: number;
  limit?: number;
}

function isPaginatedResult(value: unknown): value is PaginatedResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray((value as PaginatedResult).items) &&
    'total' in value &&
    typeof (value as PaginatedResult).total === 'number'
  );
}

function isAlreadyWrapped(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'data' in value;
}

@Injectable()
export class ResponseWrapperInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (value === null || value === undefined) {
          return value;
        }

        if (isAlreadyWrapped(value)) {
          return value;
        }

        if (isPaginatedResult(value)) {
          return {
            data: value.items,
            meta: {
              total: value.total,
              page: value.page ?? 1,
              limit: value.limit ?? value.items.length,
            },
          };
        }

        return { data: value };
      }),
    );
  }
}
