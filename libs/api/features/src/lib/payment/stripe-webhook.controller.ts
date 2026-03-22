import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service.js';
import { PaymentService } from './payment.service.js';

/**
 * Stripe webhook endpoint — NO JwtAuthGuard.
 * Authentication is via Stripe signature verification.
 * Requires rawBody: true in NestFactory.create() options (see apps/api/src/main.ts).
 */
@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Raw body not available');
    }

    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'] ?? '';
    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured — webhook validation skipped in dev');
    }

    let event;
    try {
      event = this.stripeService.constructWebhookEvent(req.rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Stripe webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException('Invalid Stripe signature');
    }

    await this.paymentService.handleStripeWebhook(event);
    return { received: true };
  }
}
