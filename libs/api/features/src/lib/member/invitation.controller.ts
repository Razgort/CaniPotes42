import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  ClubGuard,
  RolesGuard,
  CurrentClub,
  Roles,
  ZodValidationPipe,
} from '@org/api-core';
import type { JwtPayload } from '@org/api-core';
import { createInvitationSchema } from './dto/create-invitation.dto.js';
import type { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { InviteService } from './invite.service.js';
import type { Request } from 'express';

@Controller()
export class InvitationController {

  constructor(private readonly inviteService: InviteService) {}

  @Post('clubs/:clubId/invitations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @UsePipes(new ZodValidationPipe(createInvitationSchema))
  async createInvitations(
    @CurrentClub() clubId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.inviteService.createInvitations(clubId, dto);
  }

  @Get('invitations/:token')
  async getInvitationStatus(@Param('token') token: string) {
    return this.inviteService.getInvitationStatus(token);
  }

  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Param('token') token: string,
    @Req() req: Request,
  ) {
    // Try to extract user from JWT if present (optional auth)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const user = (req as any).user as JwtPayload | undefined;
      if (user) {
        const result = await this.inviteService.acceptInvitation(token, user.sub);
        return result;
      }
    }

    // No auth — check invitation validity and redirect to registration
    const invitationInfo = await this.inviteService.acceptInvitationByToken(token);
    if (!invitationInfo.valid) {
      return { redirectTo: null, token, status: 'invalid' };
    }

    return { redirectTo: '/register', token };
  }
}
