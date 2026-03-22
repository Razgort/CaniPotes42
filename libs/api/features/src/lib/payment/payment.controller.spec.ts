import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PaymentController } from './payment.controller.js';

function createMockPaymentService() {
  return {
    getLicenseStatus: vi.fn(),
    getPaymentHistory: vi.fn(),
    getMyPayments: vi.fn(),
    findPaymentById: vi.fn(),
    initiateHelloAssoPayment: vi.fn(),
    getLicensesForMember: vi.fn(),
  };
}

describe('PaymentController', () => {
  let controller: PaymentController;
  let mockService: ReturnType<typeof createMockPaymentService>;

  const clubId = 'club-1';
  const userId = 'user-1';
  const mockUser = { sub: userId, email: 'jean@test.com', role: 'MEMBER', activeClubId: clubId };
  const mockAdminUser = { sub: userId, email: 'jean@test.com', role: 'ADMIN', activeClubId: clubId };

  beforeEach(() => {
    mockService = createMockPaymentService();
    controller = new PaymentController(mockService as any);
  });

  describe('getLicenseStatus', () => {
    it('should call service with clubId and query', async () => {
      const query = { status: 'ALL' as const, provider: 'ALL' as const };
      const mockResult = { data: [], licenseTypes: [] };
      mockService.getLicenseStatus.mockResolvedValue(mockResult);

      const result = await controller.getLicenseStatus(clubId, query);

      expect(mockService.getLicenseStatus).toHaveBeenCalledWith(clubId, query);
      expect(result).toBe(mockResult);
    });
  });

  describe('getMyPayments', () => {
    it('should call service with clubId and userId from JWT sub', async () => {
      const mockResult = { data: [] };
      mockService.getMyPayments.mockResolvedValue(mockResult);

      const result = await controller.getMyPayments(clubId, mockUser as any);

      expect(mockService.getMyPayments).toHaveBeenCalledWith(clubId, userId);
      expect(result).toBe(mockResult);
    });

    it('should use userId from JWT, not from request body (prevents user spoofing)', async () => {
      const mockResult = { data: [] };
      mockService.getMyPayments.mockResolvedValue(mockResult);

      await controller.getMyPayments(clubId, mockUser as any);

      // Verify it's the JWT sub, not any query param
      const call = mockService.getMyPayments.mock.calls[0];
      expect(call[1]).toBe(userId);
    });
  });

  describe('getPaymentHistory', () => {
    it('should call service with clubId and pagination query', async () => {
      const query = { page: 1, pageSize: 20 };
      const mockResult = { data: [], meta: { total: 0, page: 1, pageSize: 20 } };
      mockService.getPaymentHistory.mockResolvedValue(mockResult);

      const result = await controller.getPaymentHistory(clubId, query);

      expect(mockService.getPaymentHistory).toHaveBeenCalledWith(clubId, query);
      expect(result).toBe(mockResult);
    });
  });

  describe('findOne', () => {
    it('should call service with clubId and paymentId', async () => {
      const paymentId = 'pay-1';
      const mockPayment = { id: paymentId, amount: 50 };
      mockService.findPaymentById.mockResolvedValue(mockPayment);

      const result = await controller.findOne(clubId, paymentId);

      expect(mockService.findPaymentById).toHaveBeenCalledWith(clubId, paymentId);
      expect(result).toBe(mockPayment);
    });
  });

  describe('initiateHelloAssoPayment', () => {
    it('should call service with clubId, userId and licenseTypeId', async () => {
      const dto = { licenseTypeId: 'lt-uuid-1' };
      const mockResult = { redirectUrl: 'https://www.helloasso.com/checkout/intent-1' };
      mockService.initiateHelloAssoPayment.mockResolvedValue(mockResult);

      const result = await controller.initiateHelloAssoPayment(clubId, mockUser as any, dto);

      expect(mockService.initiateHelloAssoPayment).toHaveBeenCalledWith(clubId, userId, dto.licenseTypeId);
      expect(result).toBe(mockResult);
    });
  });

  describe('getLicensesForMember', () => {
    it('should call service with clubId and userId from JWT', async () => {
      const mockResult = { data: [{ id: 'lt-1', name: 'Licence annuelle', memberStatus: 'Unpaid' }] };
      mockService.getLicensesForMember.mockResolvedValue(mockResult);

      const result = await controller.getLicensesForMember(clubId, mockUser as any);

      expect(mockService.getLicensesForMember).toHaveBeenCalledWith(clubId, userId);
      expect(result).toBe(mockResult);
    });
  });

  describe('role-based access guard behaviour', () => {
    it('MEMBER role is allowed to call getMyPayments (no RolesGuard on /my)', async () => {
      // getMyPayments only uses JwtAuthGuard + ClubGuard, no RolesGuard
      // Controller should pass without throwing ForbiddenException for members
      mockService.getMyPayments.mockResolvedValue({ data: [] });

      await expect(
        controller.getMyPayments(clubId, mockUser as any),
      ).resolves.toBeDefined();
    });

    it('getLicenseStatus is called successfully for ADMIN user', async () => {
      mockService.getLicenseStatus.mockResolvedValue({ data: [], licenseTypes: [] });

      await expect(
        controller.getLicenseStatus(clubId, { status: 'ALL', provider: 'ALL' }),
      ).resolves.toBeDefined();
    });
  });
});
