import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import {
  JwtAuthGuard,
  ClubGuard,
  RolesGuard,
  CurrentClub,
  CurrentUser,
  Roles,
  ZodValidationPipe,
} from '@org/api-core';
import type { JwtPayload } from '@org/api-core';
import {
  licenseStatusQuerySchema,
  paymentHistoryQuerySchema,
  initiatePaymentSchema,
} from '@org/types';
import type { LicenseStatusQuery, PaymentHistoryQuery, InitiatePayment } from '@org/types';
import { PaymentService } from './payment.service.js';

@Controller('payments')
@UseGuards(JwtAuthGuard, ClubGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ─── Stripe Checkout (Story 9.2) ──────────────────────────────────────────

  @Post('stripe/checkout')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(initiatePaymentSchema))
  async initiateStripeCheckout(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitiatePayment,
  ) {
    return this.paymentService.initiateStripeCheckout(clubId, user.sub, dto.licenseTypeId);
  }

  @Get('stripe/status')
  async getStripePaymentStatus(
    @CurrentClub() clubId: string,
    @Query('sessionId') sessionId: string,
  ) {
    const status = await this.paymentService.getPaymentStatusBySession(clubId, sessionId);
    return { status };
  }

  // ─── HelloAsso Checkout (Story 9.3) ───────────────────────────────────────

  @Post('helloasso/initiate')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(initiatePaymentSchema))
  async initiateHelloAssoPayment(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitiatePayment,
  ) {
    return this.paymentService.initiateHelloAssoPayment(clubId, user.sub, dto.licenseTypeId);
  }

  @Get('licenses')
  async getLicensesForMember(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.getLicensesForMember(clubId, user.sub);
  }

  // ─── License Status & Payment History ─────────────────────────────────────

  @Get('license-status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  async getLicenseStatus(
    @CurrentClub() clubId: string,
    @Query(new ZodValidationPipe(licenseStatusQuerySchema)) query: LicenseStatusQuery,
  ) {
    return this.paymentService.getLicenseStatus(clubId, query);
  }

  // CRITICAL: /my must be declared before /:paymentId to avoid NestJS treating "my" as a param
  @Get('my')
  async getMyPayments(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.getMyPayments(clubId, user.sub);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  async getPaymentHistory(
    @CurrentClub() clubId: string,
    @Query(new ZodValidationPipe(paymentHistoryQuerySchema)) query: PaymentHistoryQuery,
  ) {
    return this.paymentService.getPaymentHistory(clubId, query);
  }

  @Get(':paymentId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  async findOne(
    @CurrentClub() clubId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentService.findPaymentById(clubId, paymentId);
  }
}
