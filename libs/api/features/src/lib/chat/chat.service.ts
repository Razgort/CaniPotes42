import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@org/api-core';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

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
