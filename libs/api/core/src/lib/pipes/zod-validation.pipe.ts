import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    const details = (result.error as ZodError).issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    throw new BadRequestException({
      message: 'Validation failed',
      details,
    });
  }
}
