import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { ChatGateway } from './chat.gateway.js';
import { getMissedMessagesQuerySchema } from './dto/get-missed-messages.dto.js';

@Controller('channels')
@UseGuards(JwtAuthGuard, ClubGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get()
  async listChannels(@CurrentClub() clubId: string) {
    return this.chatService.listChannels(clubId);
  }

  @Get(':channelId/messages')
  async getMessages(
    @CurrentClub() clubId: string,
    @Param('channelId') channelId: string,
    @Query('since') since?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    // Missed messages fetch (reconnection use case)
    if (since !== undefined) {
      const result = getMissedMessagesQuerySchema.safeParse({ since });
      if (!result.success) {
        throw new BadRequestException(
          'Le paramètre "since" doit être une date ISO8601 valide',
        );
      }
      return this.chatService.getMissedMessages(channelId, new Date(since), clubId);
    }

    const messageLimit = limit ? parseInt(limit, 10) : 50;
    if (cursor !== undefined) {
      return this.chatService.getHistory(channelId, clubId, messageLimit, cursor);
    }
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

  @Post(':channelId/messages/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('channelId') channelId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Type de fichier non supporté. JPEG, PNG ou WebP requis.',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException(
        'Fichier trop volumineux. Taille maximale: 5MB.',
      );
    }

    try {
      const message = await this.chatService.uploadImage(
        channelId,
        user.sub,
        clubId,
        file,
      );

      // Broadcast to all channel members via WebSocket
      this.chatGateway.server
        .to(`club:${clubId}:channel:${channelId}`)
        .emit('chat:message', message);

      return message;
    } catch {
      throw new InternalServerErrorException(
        'Échec du téléversement de l\'image.',
      );
    }
  }
}
