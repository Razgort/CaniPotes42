import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { StripeService } from './stripe.service.js';
import { StripeWebhookController } from './stripe-webhook.controller.js';
import { HelloAssoService } from './helloasso.service.js';
import { HelloAssoWebhookController } from './helloasso-webhook.controller.js';

@Module({
  controllers: [PaymentController, StripeWebhookController, HelloAssoWebhookController],
  providers: [PaymentService, StripeService, HelloAssoService],
  exports: [PaymentService],
})
export class PaymentModule {}
