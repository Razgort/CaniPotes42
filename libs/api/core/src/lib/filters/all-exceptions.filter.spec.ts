import { describe, it, expect, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

function createMockHost(): { host: ArgumentsHost; response: any } {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({}),
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('should handle HttpException with string response', () => {
    const { host, response } = createMockHost();

    filter.catch(new NotFoundException('Resource not found'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      error: 'NOT_FOUND',
      message: 'Resource not found',
    });
  });

  it('should handle BadRequestException with validation details', () => {
    const { host, response } = createMockHost();
    const details = [{ field: 'email', message: 'Invalid email' }];

    filter.catch(
      new BadRequestException({ message: 'Validation failed', details }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details,
    });
  });

  it('should handle ForbiddenException', () => {
    const { host, response } = createMockHost();

    filter.catch(new ForbiddenException('Insufficient permissions'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 403,
      error: 'FORBIDDEN',
      message: 'Insufficient permissions',
    });
  });

  it('should handle unknown exceptions as 500', () => {
    const { host, response } = createMockHost();

    filter.catch(new Error('Something broke'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });

  it('should not expose stack traces in response', () => {
    const { host, response } = createMockHost();
    const error = new Error('secret info');
    error.stack = 'stack trace with internal paths';

    filter.catch(error, host);

    const jsonArg = response.json.mock.calls[0][0];
    expect(jsonArg).not.toHaveProperty('stack');
    expect(jsonArg.message).toBe('Internal server error');
  });
});
