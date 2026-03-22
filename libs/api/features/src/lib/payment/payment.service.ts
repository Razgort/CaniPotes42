import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@org/api-core';
import type { LicenseStatusQuery, PaymentHistoryQuery, HelloAssoWebhook } from '@org/types';
import { StripeService } from './stripe.service.js';
import { HelloAssoService } from './helloasso.service.js';
import type Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly helloAssoService: HelloAssoService,
  ) {}

  async getLicenseStatus(clubId: string, query: LicenseStatusQuery) {
    const { season, status, provider, search } = query;

    // Fetch all active members for this club
    const members = await (this.prisma as any).clubMember.findMany({
      where: { clubId, status: 'ACTIVE' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [
        { user: { lastName: 'asc' } },
        { user: { firstName: 'asc' } },
      ],
    });

    // Fetch license types for this club, optionally filtered by season
    const licenseTypeWhere: Record<string, unknown> = { clubId, deletedAt: null };
    if (season) {
      licenseTypeWhere['season'] = season;
    }

    const licenseTypes = await (this.prisma as any).licenseType.findMany({
      where: licenseTypeWhere,
      orderBy: [{ season: 'asc' }, { name: 'asc' }],
    });

    // Fetch all payments for this club, joined with licenseType
    const paymentWhere: Record<string, unknown> = { clubId };
    if (season) {
      paymentWhere['licenseType'] = { season };
    }

    const payments = await (this.prisma as any).payment.findMany({
      where: paymentWhere,
      include: {
        licenseType: {
          select: { id: true, name: true, season: true, paymentProvider: true },
        },
      },
    });

    // Index payments by userId + licenseTypeId for fast lookup
    const paymentIndex = new Map<string, typeof payments[0]>();
    for (const p of payments) {
      paymentIndex.set(`${p.userId}:${p.licenseTypeId}`, p);
    }

    // Build the matrix rows
    let rows = members.map((member: any) => {
      const fullName = `${member.user.firstName} ${member.user.lastName}`;
      const memberPayments = licenseTypes.map((lt: any) => {
        const payment = paymentIndex.get(`${member.userId}:${lt.id}`);
        return {
          licenseTypeId: lt.id,
          licenseTypeName: lt.name,
          season: lt.season,
          provider: lt.paymentProvider,
          status: payment ? payment.status : null,
          amount: payment ? Number(payment.amount) : null,
          paymentDate: payment ? payment.paymentDate : null,
          paymentId: payment ? payment.id : null,
          transactionId: payment?.stripeSessionId ?? payment?.helloAssoCheckoutIntentId ?? null,
        };
      });

      return {
        memberId: member.userId,
        membershipId: member.id,
        memberName: fullName,
        payments: memberPayments,
      };
    });

    // Apply member name search
    if (search) {
      const term = search.toLowerCase();
      rows = rows.filter((r: any) =>
        r.memberName.toLowerCase().includes(term),
      );
    }

    // Apply status filter
    if (status && status !== 'ALL') {
      rows = rows.filter((r: any) => {
        return r.payments.some((p: any) => {
          if (status === 'PAID') return p.status === 'COMPLETED';
          if (status === 'PENDING') return p.status === 'PENDING';
          if (status === 'UNPAID') return !p.status || p.status === 'FAILED' || p.status === 'REFUNDED';
          return true;
        });
      });
    }

    // Apply provider filter
    if (provider && provider !== 'ALL') {
      rows = rows.filter((r: any) =>
        r.payments.some((p: any) => p.provider === provider),
      );
    }

    this.logger.log(`License status fetched for club ${clubId}: ${rows.length} members`);

    return {
      data: rows,
      licenseTypes: licenseTypes.map((lt: any) => ({
        id: lt.id,
        name: lt.name,
        season: lt.season,
        paymentProvider: lt.paymentProvider,
      })),
    };
  }

  async getPaymentHistory(clubId: string, query: PaymentHistoryQuery) {
    const { page, pageSize, season } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { clubId };
    if (season) {
      where['licenseType'] = { season };
    }

    const [payments, total] = await Promise.all([
      (this.prisma as any).payment.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          licenseType: {
            select: { id: true, name: true, season: true, paymentProvider: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      (this.prisma as any).payment.count({ where }),
    ]);

    return {
      data: payments.map(this.mapPayment),
      meta: { total, page, pageSize },
    };
  }

  async getMyPayments(clubId: string, userId: string) {
    const payments = await (this.prisma as any).payment.findMany({
      where: { clubId, userId },
      include: {
        licenseType: {
          select: { id: true, name: true, season: true, paymentProvider: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: payments.map(this.mapMyPayment) };
  }

  async findPaymentById(clubId: string, paymentId: string) {
    const payment = await (this.prisma as any).payment.findFirst({
      where: { id: paymentId, clubId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        licenseType: {
          select: { id: true, name: true, season: true, paymentProvider: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.mapPayment(payment);
  }

  // ─── Stripe Checkout (Story 9.2) ──────────────────────────────────────────

  async initiateStripeCheckout(clubId: string, userId: string, licenseTypeId: string) {
    // AC8: always fetch amount from DB, never trust client
    const licenseType = await (this.prisma as any).licenseType.findFirst({
      where: { id: licenseTypeId, clubId, deletedAt: null, paymentProvider: 'STRIPE' },
    });

    if (!licenseType) {
      throw new NotFoundException('License type not found or not available for Stripe payment');
    }

    const successUrl =
      process.env['STRIPE_SUCCESS_URL'] ??
      'http://localhost:4200/payment/success?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl =
      process.env['STRIPE_CANCEL_URL'] ?? 'http://localhost:4200/payment/cancelled';

    const session = await this.stripeService.createCheckoutSession({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            // amount stored as whole euros; Stripe expects cents
            unit_amount: Number(licenseType.amount) * 100,
            product_data: { name: licenseType.name },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, clubId, licenseTypeId },
      client_reference_id: `${userId}:${licenseTypeId}`,
    });

    const payment = await (this.prisma as any).payment.create({
      data: {
        clubId,
        userId,
        licenseTypeId,
        amount: licenseType.amount,
        status: 'PENDING',
        stripeSessionId: session.id,
      },
    });

    this.logger.log(`Stripe checkout initiated: session=${session.id} payment=${payment.id}`);
    return { sessionUrl: session.url as string, paymentId: payment.id as string };
  }

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Idempotent: updateMany with status filter — second call finds no PENDING rows
        const result = await (this.prisma as any).payment.updateMany({
          where: { stripeSessionId: session.id, status: 'PENDING' },
          data: { status: 'COMPLETED', paymentDate: new Date() },
        });
        this.logger.log(
          `checkout.session.completed: session=${session.id} updated=${result.count}`,
        );
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await (this.prisma as any).payment.updateMany({
          where: { stripeSessionId: session.id, status: 'PENDING' },
          data: { status: 'FAILED' },
        });
        this.logger.log(`checkout.session.expired: session=${session.id}`);
        break;
      }

      case 'charge.refunded': {
        // charge.refunded doesn't carry a session ID directly.
        // For now, log for manual reconciliation — full refund handling requires
        // storing payment_intent ID on Payment record (future enhancement).
        const charge = event.data.object as Stripe.Charge;
        this.logger.log(`charge.refunded: charge=${charge.id} — manual reconciliation may be needed`);
        break;
      }

      default:
        // Silently ignore unknown event types — Stripe sends many
        break;
    }
  }

  async getPaymentStatusBySession(clubId: string, sessionId: string) {
    const payment = await (this.prisma as any).payment.findFirst({
      where: { clubId, stripeSessionId: sessionId },
      select: { status: true },
    });
    return payment?.status ?? 'PENDING';
  }

  // ─── HelloAsso Checkout (Story 9.3) ───────────────────────────────────────

  async initiateHelloAssoPayment(
    clubId: string,
    userId: string,
    licenseTypeId: string,
  ): Promise<{ redirectUrl: string }> {
    const licenseType = await (this.prisma as any).licenseType.findFirst({
      where: { id: licenseTypeId, clubId, deletedAt: null, paymentProvider: 'HELLOASSO' },
    });

    if (!licenseType) {
      throw new NotFoundException('Ce type de licence n\'est plus disponible.');
    }

    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:4200';
    const amountCents = Math.round(parseFloat(licenseType.amount.toString()) * 100);

    // Idempotency: update existing PENDING record rather than creating duplicates
    const existing = await (this.prisma as any).payment.findFirst({
      where: {
        userId,
        licenseTypeId,
        status: 'PENDING',
        helloAssoCheckoutIntentId: { not: null },
      },
    });

    const checkoutIntent = await this.helloAssoService.createCheckoutIntent({
      totalAmountCents: amountCents,
      itemName: `${licenseType.name} — Saison ${licenseType.season}`,
      returnUrl: `${frontendUrl}/payments/return?provider=helloasso`,
      backUrl: `${frontendUrl}/payments/cancel`,
      metadata: `userId=${userId}&clubId=${clubId}&licenseTypeId=${licenseTypeId}`,
    });

    if (existing) {
      await (this.prisma as any).payment.update({
        where: { id: existing.id },
        data: { helloAssoCheckoutIntentId: checkoutIntent.id },
      });
      this.logger.log(`HelloAsso re-initiated: updated payment ${existing.id} with new intent ${checkoutIntent.id}`);
    } else {
      const payment = await (this.prisma as any).payment.create({
        data: {
          clubId,
          userId,
          licenseTypeId,
          amount: licenseType.amount,
          status: 'PENDING',
          helloAssoCheckoutIntentId: checkoutIntent.id,
        },
      });
      this.logger.log(`HelloAsso checkout initiated: intent=${checkoutIntent.id} payment=${payment.id}`);
    }

    return { redirectUrl: checkoutIntent.redirectUrl };
  }

  async handleHelloAssoWebhook(payload: HelloAssoWebhook): Promise<void> {
    if (payload.eventType !== 'Payment') {
      this.logger.log(`HelloAsso webhook eventType '${payload.eventType}' — ignored`);
      return;
    }

    const { checkoutIntentId, state } = payload.data;

    const payment = await (this.prisma as any).payment.findUnique({
      where: { helloAssoCheckoutIntentId: checkoutIntentId },
    });

    if (!payment) {
      this.logger.warn(`HelloAsso webhook: no Payment found for checkoutIntentId=${checkoutIntentId}`);
      return;
    }

    if (state === 'Authorized') {
      if (payment.status === 'COMPLETED') {
        this.logger.log(`HelloAsso webhook idempotent: Payment ${payment.id} already COMPLETED`);
        return;
      }
      await (this.prisma as any).payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED', paymentDate: new Date() },
      });
      this.logger.log(`HelloAsso webhook: Payment ${payment.id} → COMPLETED`);
    } else if (state === 'Refused') {
      await (this.prisma as any).payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      this.logger.log(`HelloAsso webhook: Payment ${payment.id} → FAILED`);
    } else if (state === 'Refunded') {
      await (this.prisma as any).payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });
      this.logger.log(`HelloAsso webhook: Payment ${payment.id} → REFUNDED`);
    }
  }

  async getLicensesForMember(clubId: string, userId: string) {
    const [licenseTypes, memberPayments] = await Promise.all([
      (this.prisma as any).licenseType.findMany({
        where: { clubId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      }),
      (this.prisma as any).payment.findMany({
        where: { userId, clubId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const paymentByLicenseType = new Map<string, typeof memberPayments[0]>();
    for (const p of memberPayments) {
      if (!paymentByLicenseType.has(p.licenseTypeId)) {
        paymentByLicenseType.set(p.licenseTypeId, p);
      }
    }

    const result = licenseTypes.map((lt: any) => {
      const latestPayment = paymentByLicenseType.get(lt.id);
      let memberStatus: 'Paid' | 'Pending' | 'Unpaid' = 'Unpaid';
      if (latestPayment?.status === 'COMPLETED') memberStatus = 'Paid';
      else if (latestPayment?.status === 'PENDING') memberStatus = 'Pending';

      return {
        id: lt.id,
        name: lt.name,
        amount: Number(lt.amount),
        season: lt.season,
        paymentProvider: lt.paymentProvider,
        memberStatus,
      };
    });

    return { data: result };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private mapPayment(payment: any) {
    return {
      id: payment.id,
      memberName: `${payment.user.firstName} ${payment.user.lastName}`,
      userId: payment.user.id,
      licenseTypeName: payment.licenseType.name,
      licenseTypeId: payment.licenseType.id,
      season: payment.licenseType.season,
      provider: payment.licenseType.paymentProvider,
      amount: Number(payment.amount),
      status: payment.status,
      paymentDate: payment.paymentDate,
      transactionId: payment.stripeSessionId ?? payment.helloAssoCheckoutIntentId ?? null,
      createdAt: payment.createdAt,
    };
  }

  private mapMyPayment(payment: any) {
    return {
      id: payment.id,
      licenseTypeName: payment.licenseType.name,
      licenseTypeId: payment.licenseType.id,
      season: payment.licenseType.season,
      provider: payment.licenseType.paymentProvider,
      amount: Number(payment.amount),
      status: payment.status,
      paymentDate: payment.paymentDate,
      transactionId: payment.stripeSessionId ?? payment.helloAssoCheckoutIntentId ?? null,
      createdAt: payment.createdAt,
    };
  }
}
