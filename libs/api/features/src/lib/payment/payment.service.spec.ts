import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service.js';

function createMockPrisma() {
  return {
    clubMember: {
      findMany: vi.fn(),
    },
    licenseType: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

function createMockStripeService() {
  return {
    createCheckoutSession: vi.fn(),
  };
}

function createMockHelloAssoService() {
  return {
    createCheckoutIntent: vi.fn(),
  };
}

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockStripeService: ReturnType<typeof createMockStripeService>;
  let mockHelloAssoService: ReturnType<typeof createMockHelloAssoService>;

  const clubId = 'club-1';
  const otherClubId = 'club-2';
  const userId = 'user-1';
  const userId2 = 'user-2';
  const licenseTypeId = 'lt-1';
  const paymentId = 'pay-1';

  const mockMember1 = {
    id: 'membership-1',
    userId,
    clubId,
    status: 'ACTIVE',
    user: { id: userId, firstName: 'Jean', lastName: 'Dupont' },
  };

  const mockMember2 = {
    id: 'membership-2',
    userId: userId2,
    clubId,
    status: 'ACTIVE',
    user: { id: userId2, firstName: 'Marie', lastName: 'Martin' },
  };

  const mockLicenseType = {
    id: licenseTypeId,
    clubId,
    name: 'Licence annuelle',
    season: '2025-2026',
    paymentProvider: 'STRIPE',
    deletedAt: null,
  };

  const mockPayment = {
    id: paymentId,
    clubId,
    userId,
    licenseTypeId,
    amount: { toString: () => '50' },
    status: 'COMPLETED',
    stripeSessionId: 'cs_test_123',
    helloAssoCheckoutIntentId: null,
    paymentDate: new Date('2026-01-15'),
    createdAt: new Date('2026-01-15'),
    user: { id: userId, firstName: 'Jean', lastName: 'Dupont' },
    licenseType: {
      id: licenseTypeId,
      name: 'Licence annuelle',
      season: '2025-2026',
      paymentProvider: 'STRIPE',
    },
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockStripeService = createMockStripeService();
    mockHelloAssoService = createMockHelloAssoService();
    service = new PaymentService(mockPrisma as any, mockStripeService as any, mockHelloAssoService as any);
  });

  describe('getLicenseStatus', () => {
    it('should return matrix scoped strictly to clubId', async () => {
      mockPrisma.clubMember.findMany.mockResolvedValue([mockMember1]);
      mockPrisma.licenseType.findMany.mockResolvedValue([mockLicenseType]);
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);

      await service.getLicenseStatus(clubId, { status: 'ALL', provider: 'ALL' });

      expect(mockPrisma.clubMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clubId }) }),
      );
      expect(mockPrisma.licenseType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clubId }) }),
      );
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clubId }) }),
      );
    });

    it('should build correct matrix with payment status for each member', async () => {
      mockPrisma.clubMember.findMany.mockResolvedValue([mockMember1, mockMember2]);
      mockPrisma.licenseType.findMany.mockResolvedValue([mockLicenseType]);
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);

      const result = await service.getLicenseStatus(clubId, { status: 'ALL', provider: 'ALL' });

      expect(result.data).toHaveLength(2);
      const jean = result.data.find((r: any) => r.memberId === userId);
      const marie = result.data.find((r: any) => r.memberId === userId2);

      expect(jean!.payments[0].status).toBe('COMPLETED');
      expect(jean!.payments[0].transactionId).toBe('cs_test_123');
      expect(marie!.payments[0].status).toBeNull();
    });

    it('should never return data from a different club (tenant isolation)', async () => {
      mockPrisma.clubMember.findMany.mockResolvedValue([]);
      mockPrisma.licenseType.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);

      await service.getLicenseStatus(otherClubId, { status: 'ALL', provider: 'ALL' });

      expect(mockPrisma.clubMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clubId: otherClubId }) }),
      );
    });

    it('should filter by member name search', async () => {
      mockPrisma.clubMember.findMany.mockResolvedValue([mockMember1, mockMember2]);
      mockPrisma.licenseType.findMany.mockResolvedValue([mockLicenseType]);
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getLicenseStatus(clubId, {
        status: 'ALL',
        provider: 'ALL',
        search: 'jean',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].memberName).toBe('Jean Dupont');
    });

    it('should filter to only PAID members', async () => {
      mockPrisma.clubMember.findMany.mockResolvedValue([mockMember1, mockMember2]);
      mockPrisma.licenseType.findMany.mockResolvedValue([mockLicenseType]);
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);

      const result = await service.getLicenseStatus(clubId, {
        status: 'PAID',
        provider: 'ALL',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].memberId).toBe(userId);
    });

    it('should filter by provider', async () => {
      mockPrisma.clubMember.findMany.mockResolvedValue([mockMember1]);
      mockPrisma.licenseType.findMany.mockResolvedValue([mockLicenseType]);
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);

      const result = await service.getLicenseStatus(clubId, {
        status: 'ALL',
        provider: 'HELLOASSO',
      });

      // mockPayment has STRIPE provider on licenseType — HELLOASSO filter should return no rows
      expect(result.data).toHaveLength(0);
    });

    it('should filter by season', async () => {
      mockPrisma.clubMember.findMany.mockResolvedValue([mockMember1]);
      mockPrisma.licenseType.findMany.mockResolvedValue([mockLicenseType]);
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);

      await service.getLicenseStatus(clubId, {
        status: 'ALL',
        provider: 'ALL',
        season: '2025-2026',
      });

      expect(mockPrisma.licenseType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clubId, season: '2025-2026' }),
        }),
      );
    });
  });

  describe('getPaymentHistory', () => {
    it('should return paginated payments scoped to clubId', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrisma.payment.count.mockResolvedValue(1);

      const result = await service.getPaymentHistory(clubId, { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, pageSize: 20 });
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clubId }),
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should apply correct pagination offset', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await service.getPaymentHistory(clubId, { page: 3, pageSize: 10 });

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should order by createdAt DESC', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await service.getPaymentHistory(clubId, { page: 1, pageSize: 20 });

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should convert Decimal amount to number', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrisma.payment.count.mockResolvedValue(1);

      const result = await service.getPaymentHistory(clubId, { page: 1, pageSize: 20 });

      expect(typeof result.data[0].amount).toBe('number');
    });
  });

  describe('getMyPayments', () => {
    it('should query with both clubId AND userId', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);

      await service.getMyPayments(clubId, userId);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId, userId },
        }),
      );
    });

    it('should not return payments from other users in the same club', async () => {
      const user2Payment = { ...mockPayment, id: 'pay-2', userId: userId2 };
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);

      const result = await service.getMyPayments(clubId, userId);

      // Only userId's payment returned
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId, userId } }),
      );
      // The other user's payment is not in the result
      expect(result.data.find((p: any) => p.id === user2Payment.id)).toBeUndefined();
    });

    it('should not expose data from other clubs', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);

      await service.getMyPayments(otherClubId, userId);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: otherClubId, userId } }),
      );
    });

    it('should return empty array when member has no payments', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getMyPayments(clubId, userId);

      expect(result.data).toEqual([]);
    });
  });

  describe('findPaymentById', () => {
    it('should find a payment scoped to clubId', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment);

      const result = await service.findPaymentById(clubId, paymentId);

      expect(result.id).toBe(paymentId);
      expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: paymentId, clubId },
        }),
      );
    });

    it('should throw NotFoundException when payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.findPaymentById(clubId, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should not find payment from another club', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.findPaymentById(otherClubId, paymentId)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: paymentId, clubId: otherClubId } }),
      );
    });
  });

  describe('initiateHelloAssoPayment', () => {
    const mockHaLicenseType = {
      id: licenseTypeId,
      clubId,
      name: 'Licence annuelle',
      season: '2025-2026',
      paymentProvider: 'HELLOASSO',
      amount: { toString: () => '50' },
      deletedAt: null,
    };

    it('creates a Payment record and returns redirectUrl', async () => {
      mockPrisma.licenseType.findFirst.mockResolvedValue(mockHaLicenseType);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-ha-1' });
      mockHelloAssoService.createCheckoutIntent.mockResolvedValue({
        id: 'intent-1',
        redirectUrl: 'https://www.helloasso.com/checkout/intent-1',
      });

      const result = await service.initiateHelloAssoPayment(clubId, userId, licenseTypeId);

      expect(result.redirectUrl).toBe('https://www.helloasso.com/checkout/intent-1');
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clubId,
            userId,
            licenseTypeId,
            status: 'PENDING',
            helloAssoCheckoutIntentId: 'intent-1',
          }),
        }),
      );
    });

    it('converts amount from euros to cents when calling HelloAsso', async () => {
      mockPrisma.licenseType.findFirst.mockResolvedValue(mockHaLicenseType);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-ha-1' });
      mockHelloAssoService.createCheckoutIntent.mockResolvedValue({
        id: 'intent-1',
        redirectUrl: 'https://helloasso.com/redirect',
      });

      await service.initiateHelloAssoPayment(clubId, userId, licenseTypeId);

      expect(mockHelloAssoService.createCheckoutIntent).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmountCents: 5000 }), // €50 → 5000 cents
      );
    });

    it('updates existing PENDING payment instead of creating duplicate (idempotency)', async () => {
      const existingPayment = { id: 'pay-existing', helloAssoCheckoutIntentId: 'old-intent' };
      mockPrisma.licenseType.findFirst.mockResolvedValue(mockHaLicenseType);
      mockPrisma.payment.findFirst.mockResolvedValue(existingPayment);
      mockPrisma.payment.update.mockResolvedValue({});
      mockHelloAssoService.createCheckoutIntent.mockResolvedValue({
        id: 'intent-new',
        redirectUrl: 'https://helloasso.com/redirect',
      });

      await service.initiateHelloAssoPayment(clubId, userId, licenseTypeId);

      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-existing' },
          data: { helloAssoCheckoutIntentId: 'intent-new' },
        }),
      );
    });

    it('throws NotFoundException if license type not found or not HELLOASSO', async () => {
      mockPrisma.licenseType.findFirst.mockResolvedValue(null);

      await expect(
        service.initiateHelloAssoPayment(clubId, userId, 'bad-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleHelloAssoWebhook', () => {
    const mockHaPayment = {
      id: 'pay-ha-1',
      status: 'PENDING',
      helloAssoCheckoutIntentId: 'intent-1',
    };

    it('updates Payment to COMPLETED on Authorized state', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockHaPayment);
      mockPrisma.payment.update.mockResolvedValue({});

      await service.handleHelloAssoWebhook({
        eventType: 'Payment',
        data: { checkoutIntentId: 'intent-1', state: 'Authorized' },
      });

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-ha-1' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('is idempotent — skips update if Payment already COMPLETED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({ ...mockHaPayment, status: 'COMPLETED' });

      await service.handleHelloAssoWebhook({
        eventType: 'Payment',
        data: { checkoutIntentId: 'intent-1', state: 'Authorized' },
      });

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });

    it('updates Payment to FAILED on Refused state', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockHaPayment);
      mockPrisma.payment.update.mockResolvedValue({});

      await service.handleHelloAssoWebhook({
        eventType: 'Payment',
        data: { checkoutIntentId: 'intent-1', state: 'Refused' },
      });

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'FAILED' },
        }),
      );
    });

    it('ignores non-Payment eventType', async () => {
      await service.handleHelloAssoWebhook({
        eventType: 'Order',
        data: { checkoutIntentId: 'intent-1', state: 'Authorized' },
      });

      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled();
    });

    it('silently returns if no Payment found for checkoutIntentId', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.handleHelloAssoWebhook({
          eventType: 'Payment',
          data: { checkoutIntentId: 'unknown-intent', state: 'Authorized' },
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('initiateStripeCheckout', () => {
    const mockStripeLicenseType = {
      id: licenseTypeId,
      clubId,
      name: 'Licence annuelle',
      season: '2025-2026',
      paymentProvider: 'STRIPE',
      amount: 50,
      deletedAt: null,
    };

    it('creates a checkout session and a PENDING Payment record', async () => {
      mockPrisma.licenseType.findFirst.mockResolvedValue(mockStripeLicenseType);
      mockStripeService.createCheckoutSession = vi.fn().mockResolvedValue({
        id: 'cs_test_stripe123',
        url: 'https://checkout.stripe.com/pay/cs_test_stripe123',
      });
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-stripe-1' });

      const result = await service.initiateStripeCheckout(clubId, userId, licenseTypeId);

      expect(result.sessionUrl).toBe('https://checkout.stripe.com/pay/cs_test_stripe123');
      expect(result.paymentId).toBe('pay-stripe-1');
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clubId,
            userId,
            licenseTypeId,
            status: 'PENDING',
            stripeSessionId: 'cs_test_stripe123',
          }),
        }),
      );
    });

    it('converts amount from euros to cents when calling Stripe', async () => {
      mockPrisma.licenseType.findFirst.mockResolvedValue(mockStripeLicenseType);
      mockStripeService.createCheckoutSession = vi.fn().mockResolvedValue({
        id: 'cs_test_stripe123',
        url: 'https://checkout.stripe.com/pay/cs_test_stripe123',
      });
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-stripe-1' });

      await service.initiateStripeCheckout(clubId, userId, licenseTypeId);

      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({ unit_amount: 5000 }), // €50 → 5000 cents
            }),
          ]),
        }),
      );
    });

    it('throws NotFoundException if license type not found or not STRIPE', async () => {
      mockPrisma.licenseType.findFirst.mockResolvedValue(null);

      await expect(
        service.initiateStripeCheckout(clubId, userId, 'bad-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('scopes license type lookup to clubId (tenant isolation)', async () => {
      mockPrisma.licenseType.findFirst.mockResolvedValue(null);

      await expect(
        service.initiateStripeCheckout(otherClubId, userId, licenseTypeId),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.licenseType.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clubId: otherClubId }),
        }),
      );
    });
  });

  describe('handleStripeWebhook', () => {
    function makeEvent(type: string, object: Record<string, unknown>) {
      return { type, data: { object } } as any;
    }

    it('updates Payment to COMPLETED on checkout.session.completed', async () => {
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

      await service.handleStripeWebhook(
        makeEvent('checkout.session.completed', { id: 'cs_test_123' }),
      );

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSessionId: 'cs_test_123', status: 'PENDING' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('is idempotent — second call finds no PENDING rows (count=0)', async () => {
      // First call marks PENDING → COMPLETED
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      await service.handleStripeWebhook(
        makeEvent('checkout.session.completed', { id: 'cs_dup' }),
      );

      // Second call: no PENDING row left, count=0, no error
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(
        service.handleStripeWebhook(makeEvent('checkout.session.completed', { id: 'cs_dup' })),
      ).resolves.not.toThrow();
    });

    it('updates Payment to FAILED on checkout.session.expired', async () => {
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

      await service.handleStripeWebhook(
        makeEvent('checkout.session.expired', { id: 'cs_expired' }),
      );

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSessionId: 'cs_expired', status: 'PENDING' },
          data: { status: 'FAILED' },
        }),
      );
    });

    it('does not throw on unknown event types', async () => {
      await expect(
        service.handleStripeWebhook(makeEvent('payment_intent.created', { id: 'pi_123' })),
      ).resolves.not.toThrow();
    });
  });

  describe('getPaymentStatusBySession', () => {
    it('returns the payment status for a given session', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ status: 'COMPLETED' });

      const status = await service.getPaymentStatusBySession(clubId, 'cs_test_123');

      expect(status).toBe('COMPLETED');
      expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId, stripeSessionId: 'cs_test_123' },
        }),
      );
    });

    it('returns "PENDING" when no payment found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      const status = await service.getPaymentStatusBySession(clubId, 'cs_unknown');

      expect(status).toBe('PENDING');
    });
  });
});
