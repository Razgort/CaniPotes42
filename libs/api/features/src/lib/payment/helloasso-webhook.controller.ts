import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { HelloAssoService } from './helloasso.service.js';
import { PaymentService } from './payment.service.js';
import { helloAssoWebhookSchema } from '@org/types';

/**
 * HelloAsso webhook endpoint — NO JwtAuthGuard.
 * Authentication is via HMAC-SHA256 signature verification (Content-Signature header).
 * Requires rawBody: true in NestFactory.create() options (apps/api/src/main.ts).
 */
@Controller('webhooks')
export class HelloAssoWebhookController {
  private readonly logger = new Logger(HelloAssoWebhookController.name);

  constructor(
    private readonly helloAssoService: HelloAssoService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post('helloasso')
  @HttpCode(200)
  async handleHelloAssoWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('content-signature') signature: string,
    @Res() res: Response,
  ) {
    if (!req.rawBody) {
      this.logger.error('Raw body not available — ensure rawBody: true in NestFactory.create()');
      res.status(400).json({ error: 'Raw body not available' });
      return;
    }

    const rawBodyStr = req.rawBody.toString('utf8');

    // Verify signature — return 401 explicitly without throwing
    const isValid = this.helloAssoService.verifyWebhookSignature(rawBodyStr, signature ?? '');
    if (!isValid) {
      this.logger.warn(`HelloAsso webhook signature mismatch — request rejected`);
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBodyStr);
    } catch {
      this.logger.error('HelloAsso webhook: invalid JSON body');
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }

    const parsed = helloAssoWebhookSchema.safeParse(payload);
    if (!parsed.success) {
      // Unknown event shape — ack anyway to prevent HelloAsso retries for unsupported events
      this.logger.log(`HelloAsso webhook: unrecognized shape — acknowledged without processing`);
      res.status(200).json({ received: true });
      return;
    }

    try {
      await this.paymentService.handleHelloAssoWebhook(parsed.data);
    } catch (err) {
      // Log but still return 200 — we don't want HelloAsso to retry on our processing errors
      this.logger.error(`HelloAsso webhook processing error`, err);
    }

    res.status(200).json({ received: true });
  }
}
