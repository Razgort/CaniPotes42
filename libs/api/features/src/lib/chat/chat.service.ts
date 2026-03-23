import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@org/api-core';
import { randomUUID } from 'crypto';
import { R2Service } from '../document/r2.service.js';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
  ) {}

  async listChannels(clubId: string) {
    const channels = await this.prisma.chatChannel.findMany({
      where: { clubId },
      orderBy: { name: 'asc' },
    });

    return channels.map((c) => ({
      id: c.id,
      clubId: c.clubId,
      name: c.name,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async getMessages(channelId: string, clubId: string, limit = 50) {
    await this.verifyChannelBelongsToClub(channelId, clubId);

    const messages = await this.prisma.chatMessage.findMany({
      where: { channelId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Return in chronological order (oldest first)
    return messages.reverse().map((m) => this.mapMessage(m));
  }

  async getHistory(
    channelId: string,
    clubId: string,
    limit = 50,
    cursor?: string,
  ) {
    await this.verifyChannelBelongsToClub(channelId, clubId);

    const take = Math.min(limit, 100);
    const where: {
      channelId: string;
      createdAt?: { lt: Date };
    } = { channelId };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1, // fetch one extra to determine hasMore
    });

    const hasMore = messages.length > take;
    const pageMessages = hasMore ? messages.slice(0, take) : messages;
    // Return in chronological order
    const ordered = pageMessages.reverse().map((m) => this.mapMessage(m));

    const nextCursor =
      hasMore && pageMessages[0]
        ? pageMessages[0].createdAt.toISOString()
        : null;

    return {
      data: ordered,
      meta: { hasMore, nextCursor },
    };
  }

  async uploadImage(
    channelId: string,
    userId: string,
    clubId: string,
    file: Express.Multer.File,
  ) {
    await this.verifyChannelBelongsToClub(channelId, clubId);

    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = mimeToExt[file.mimetype] ?? 'jpg';
    const key = `${clubId}/chat/${channelId}/${randomUUID()}.${ext}`;

    const signedUrl = await this.r2Service.upload(key, file.buffer, file.mimetype);

    const message = await this.prisma.chatMessage.create({
      data: { channelId, userId, content: '', imageUrl: signedUrl },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    this.logger.log(`Image message created: ${message.id} in channel ${channelId}`);
    return this.mapMessage(message);
  }

  async createMessage(
    channelId: string,
    userId: string,
    clubId: string,
    content: string,
  ) {
    await this.verifyChannelBelongsToClub(channelId, clubId);

    const message = await this.prisma.chatMessage.create({
      data: { channelId, userId, content },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    this.logger.log(
      `Message created: ${message.id} in channel ${channelId} by user ${userId}`,
    );

    return this.mapMessage(message);
  }

  async verifyChannelBelongsToClub(
    channelId: string,
    clubId: string,
  ) {
    const channel = await this.prisma.chatChannel.findFirst({
      where: { id: channelId, clubId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  async getMissedMessages(channelId: string, since: Date, clubId: string) {
    await this.verifyChannelBelongsToClub(channelId, clubId);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        channelId,
        createdAt: { gt: since },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { data: messages.map((m) => this.mapMessage(m)) };
  }

  async ensureGeneralChannel(clubId: string) {
    const existing = await this.prisma.chatChannel.findFirst({
      where: { clubId, name: 'General' },
    });

    if (existing) {
      return existing;
    }

    const channel = await this.prisma.chatChannel.create({
      data: { clubId, name: 'General' },
    });

    this.logger.log(`Created General channel for club ${clubId}`);
    return channel;
  }

  private mapMessage(message: {
    id: string;
    channelId: string;
    content: string;
    imageUrl: string | null;
    userId: string;
    createdAt: Date;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    };
  }) {
    return {
      id: message.id,
      channelId: message.channelId,
      content: message.content,
      imageUrl: message.imageUrl ?? null,
      userId: message.userId,
      senderName: `${message.user.firstName} ${message.user.lastName}`,
      senderAvatar: message.user.avatarUrl ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
