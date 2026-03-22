import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HelloAssoService } from './helloasso.service.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('HelloAssoService', () => {
  let service: HelloAssoService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [HelloAssoService],
    }).compile();

    service = module.get(HelloAssoService);
    // Reset token cache
    (service as unknown as { tokenCache: null }).tokenCache = null;
    mockFetch.mockReset();
  });

  describe('getAccessToken', () => {
    it('fetches and caches a token on first call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'tok_abc',
          refresh_token: 'ref_abc',
          expires_in: 3600,
        }),
      });

      const token = await service.getAccessToken();

      expect(token).toBe('tok_abc');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/oauth2/token'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('returns cached token without re-fetching', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'tok_cached',
          refresh_token: 'ref_cached',
          expires_in: 3600,
        }),
      });

      await service.getAccessToken();
      const token = await service.getAccessToken();

      expect(token).toBe('tok_cached');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws ServiceUnavailableException on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getAccessToken()).rejects.toThrow(ServiceUnavailableException);
    });

    it('throws ServiceUnavailableException on non-2xx response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      await expect(service.getAccessToken()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('createCheckoutIntent', () => {
    beforeEach(() => {
      // Pre-seed token cache
      (service as unknown as { tokenCache: object }).tokenCache = {
        accessToken: 'tok_test',
        refreshToken: 'ref_test',
        expiresAt: Date.now() + 3_600_000,
      };
    });

    it('calls HelloAsso API with correct payload and returns redirectUrl', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'intent-uuid',
          redirectUrl: 'https://www.helloasso.com/checkout/intent-uuid',
        }),
      });

      const result = await service.createCheckoutIntent({
        totalAmountCents: 2500,
        itemName: 'Licence annuelle 2025-2026',
        returnUrl: 'http://localhost:4200/payments/return',
        backUrl: 'http://localhost:4200/payments/cancel',
        metadata: 'userId=u1&clubId=c1&licenseTypeId=lt1',
      });

      expect(result).toEqual({
        id: 'intent-uuid',
        redirectUrl: 'https://www.helloasso.com/checkout/intent-uuid',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);
      expect(body.totalAmount).toBe(2500);
      expect(body.containsDonation).toBe(false);
      expect(body.itemName).toBe('Licence annuelle 2025-2026');
    });

    it('throws ServiceUnavailableException on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable',
      });

      await expect(
        service.createCheckoutIntent({
          totalAmountCents: 2500,
          itemName: 'Test',
          returnUrl: 'http://localhost/return',
          backUrl: 'http://localhost/cancel',
          metadata: '',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('returns true for matching HMAC-SHA256 signature', () => {
      process.env['HELLOASSO_WEBHOOK_SECRET'] = 'test-secret';
      const crypto = require('crypto') as typeof import('crypto');
      const rawBody = '{"eventType":"Payment"}';
      const sig = crypto.createHmac('sha256', 'test-secret').update(rawBody, 'utf8').digest('hex');

      expect(service.verifyWebhookSignature(rawBody, sig)).toBe(true);
      delete process.env['HELLOASSO_WEBHOOK_SECRET'];
    });

    it('returns false for mismatching signature', () => {
      process.env['HELLOASSO_WEBHOOK_SECRET'] = 'test-secret';

      expect(service.verifyWebhookSignature('{"eventType":"Payment"}', 'deadbeef')).toBe(false);
      delete process.env['HELLOASSO_WEBHOOK_SECRET'];
    });

    it('returns true (bypass) when HELLOASSO_WEBHOOK_SECRET not set', () => {
      delete process.env['HELLOASSO_WEBHOOK_SECRET'];
      expect(service.verifyWebhookSignature('body', 'anysig')).toBe(true);
    });
  });
});
