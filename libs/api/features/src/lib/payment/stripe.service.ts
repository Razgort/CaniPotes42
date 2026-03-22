import Stripe from 'stripe';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

const STRIPE_API_VERSION = '2026-02-25.clover' as const;

@Injectable()
export class StripeService {
  private client: Stripe | undefined;

  private getStripe(): Stripe {
    const key = process.env['STRIPE_SECRET_KEY']?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        'Stripe is not configured (set STRIPE_SECRET_KEY).',
      );
    }
    if (!this.client) {
      this.client = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
    }
    return this.client;
  }

  createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
    return this.getStripe().checkout.sessions.create(params);
  }

  constructWebhookEvent(payload: Buffer, signature: string, secret: string): Stripe.Event {
    return this.getStripe().webhooks.constructEvent(payload, signature, secret);
  }
}
