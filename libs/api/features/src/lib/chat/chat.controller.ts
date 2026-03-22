import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  ClubGuard,
  CurrentClub,
  CurrentUser,
  ZodValidationPipe,
} from '@org/api-core';
import type { JwtPayload } from '@org/api-core';
import { sendMessageSchema } from '@org/types';
import type { SendMessage } from '@org/types';
import { ChatService } from './chat.service.js';

@Controller('channels')
@UseGuards(JwtAuthGuard, ClubGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async listChannels(@CurrentClub() clubId: string) {
    return this.chatService.listChannels(clubId);
  }

  @Get(':channelId/messages')
  async getMessages(
    @CurrentClub() clubId: string,
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
  ) {
    const messageLimit = limit ? parseInt(limit, 10) : 50;
    return this.chatService.getMessages(channelId, clubId, messageLimit);
  }

  @Post(':channelId/messages')
  async createMessage(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('channelId') channelId: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessage,
  ) {
    return this.chatService.createMessage(
      channelId,
      user.sub,
      clubId,
      dto.content,
    );
  }
}
