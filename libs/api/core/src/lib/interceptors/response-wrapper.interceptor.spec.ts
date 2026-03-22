import { describe, it, expect } from 'vitest';
import { ResponseWrapperInterceptor } from './response-wrapper.interceptor.js';
import { of, lastValueFrom } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';

function createMockContext(): ExecutionContext {
  return {} as ExecutionContext;
}

function createMockHandler(value: unknown): CallHandler {
  return {
    handle: () => of(value),
  };
}

describe('ResponseWrapperInterceptor', () => {
  const interceptor = new ResponseWrapperInterceptor();

  it('should wrap a single object in { data }', async () => {
    const ctx = createMockContext();
    const handler = createMockHandler({ id: '1', name: 'Test' });

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({ data: { id: '1', name: 'Test' } });
  });

  it('should wrap an array in { data }', async () => {
    const ctx = createMockContext();
    const handler = createMockHandler([{ id: '1' }, { id: '2' }]);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({ data: [{ id: '1' }, { id: '2' }] });
  });

  it('should wrap paginated results in { data, meta }', async () => {
    const ctx = createMockContext();
    const handler = createMockHandler({
      items: [{ id: '1' }],
      total: 50,
      page: 2,
      limit: 10,
    });

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({
      data: [{ id: '1' }],
      meta: { total: 50, page: 2, limit: 10 },
    });
  });

  it('should not double-wrap already wrapped responses', async () => {
    const ctx = createMockContext();
    const handler = createMockHandler({ data: { id: '1' } });

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({ data: { id: '1' } });
  });

  it('should pass through null values unchanged', async () => {
    const ctx = createMockContext();
    const handler = createMockHandler(null);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toBeNull();
  });

  it('should pass through undefined values unchanged', async () => {
    const ctx = createMockContext();
    const handler = createMockHandler(undefined);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toBeUndefined();
  });

  it('should wrap primitive values in { data }', async () => {
    const ctx = createMockContext();
    const handler = createMockHandler('hello');

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({ data: 'hello' });
  });
});
