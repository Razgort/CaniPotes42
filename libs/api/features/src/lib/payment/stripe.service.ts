import Stripe from 'stripe';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] ?? '', {
      apiVersion: '2025-01-27.acacia',
    });
  }

  createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
    return this.stripe.checkout.sessions.create(params);
  }

  constructWebhookEvent(payload: Buffer, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
