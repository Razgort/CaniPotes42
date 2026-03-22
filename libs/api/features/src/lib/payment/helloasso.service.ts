import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface CheckoutIntentParams {
  totalAmountCents: number;
  itemName: string;
  returnUrl: string;
  backUrl: string;
  metadata: string;
}

interface CheckoutIntentResult {
  id: string;
  redirectUrl: string;
}

@Injectable()
export class HelloAssoService {
  private readonly logger = new Logger(HelloAssoService.name);
  private tokenCache: TokenCache | null = null;

  private get baseUrl(): string {
    return process.env['HELLOASSO_BASE_URL'] ?? 'https://api.helloasso-sandbox.com';
  }

  private get clientId(): string {
    return process.env['HELLOASSO_CLIENT_ID'] ?? '';
  }

  private get clientSecret(): string {
    return process.env['HELLOASSO_CLIENT_SECRET'] ?? '';
  }

  private get orgSlug(): string {
    return process.env['HELLOASSO_ORG_SLUG'] ?? '';
  }

  private get webhookSecret(): string {
    return process.env['HELLOASSO_WEBHOOK_SECRET'] ?? '';
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if still valid (with 30s buffer)
    if (this.tokenCache && this.tokenCache.expiresAt > now + 30_000) {
      return this.tokenCache.accessToken;
    }

    // Try refresh token if we have one
    if (this.tokenCache?.refreshToken) {
      try {
        const refreshed = await this.fetchToken({
          grant_type: 'refresh_token',
          refresh_token: this.tokenCache.refreshToken,
        });
        this.tokenCache = refreshed;
        return refreshed.accessToken;
      } catch {
        this.logger.warn('HelloAsso token refresh failed, falling back to client_credentials');
      }
    }

    // Fresh client_credentials auth
    const fresh = await this.fetchToken({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    this.tokenCache = fresh;
    return fresh.accessToken;
  }

  private async fetchToken(params: Record<string, string>): Promise<TokenCache> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
      });
    } catch (err) {
      this.logger.error('HelloAsso token fetch network error', err);
      throw new ServiceUnavailableException(
        'Le service HelloAsso est temporairement indisponible — réessayez plus tard',
      );
    }

    if (!response.ok) {
      this.logger.error(`HelloAsso token fetch failed: ${response.status}`);
      throw new ServiceUnavailableException(
        'Le service HelloAsso est temporairement indisponible — réessayez plus tard',
      );
    }

    const body = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: Date.now() + body.expires_in * 1000,
    };
  }

  async createCheckoutIntent(params: CheckoutIntentParams): Promise<CheckoutIntentResult> {
    const accessToken = await this.getAccessToken();

    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/v5/organizations/${this.orgSlug}/checkout-intents`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            totalAmount: params.totalAmountCents,
            initialAmount: params.totalAmountCents,
            itemName: params.itemName,
            backUrl: params.backUrl,
            returnUrl: params.returnUrl,
            containsDonation: false,
            metadata: params.metadata,
          }),
        },
      );
    } catch (err) {
      this.logger.error('HelloAsso checkout intent network error', err);
      throw new ServiceUnavailableException(
        'Le service HelloAsso est temporairement indisponible — réessayez plus tard',
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`HelloAsso checkout intent failed: ${response.status} ${text}`);
      throw new ServiceUnavailableException(
        'Le service HelloAsso est temporairement indisponible — réessayez plus tard',
      );
    }

    const body = await response.json() as { id: string; redirectUrl: string };
    return { id: body.id, redirectUrl: body.redirectUrl };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('HELLOASSO_WEBHOOK_SECRET not configured — skipping signature check');
      return true;
    }

    try {
      const crypto = require('crypto') as typeof import('crypto');
      const expected = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody, 'utf8')
        .digest('hex');

      const sigBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expected, 'hex');

      if (sigBuffer.length !== expectedBuffer.length) return false;

      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }
}
