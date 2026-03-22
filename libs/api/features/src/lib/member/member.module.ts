import { Module } from '@nestjs/common';
import { MailModule } from '@org/api-core';
import { MemberController } from './member.controller.js';
import { InvitationController } from './invitation.controller.js';
import { MemberService } from './member.service.js';
import { InviteService } from './invite.service.js';

@Module({
  imports: [MailModule],
  controllers: [MemberController, InvitationController],
  providers: [MemberService, InviteService],
  exports: [MemberService, InviteService],
})
export class MemberModule {}
