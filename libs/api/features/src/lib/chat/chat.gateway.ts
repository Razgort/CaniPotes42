import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '@org/api-core';
import type { JwtPayload } from '@org/api-core';
import { ChatService } from './chat.service.js';

@WebSocketGateway({
  cors: {
    origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:4200')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as Record<string, unknown>)?.['token'] as
          | string
          | undefined;
      const authHeader = client.handshake.headers?.['authorization'] as
        | string
        | undefined;
      const rawToken = token ?? authHeader?.replace('Bearer ', '');

      if (!rawToken) {
        this.logger.warn(`Connection rejected — no token: ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(rawToken);

      // Verify active club membership
      const membership = await this.prisma.clubMember.findFirst({
        where: {
          userId: payload.sub,
          clubId: payload.activeClubId,
        },
        select: { role: true, status: true },
      });

      if (!membership || membership.status === 'SUSPENDED') {
        this.logger.warn(
          `Connection rejected — invalid membership: ${client.id}`,
        );
        client.disconnect();
        return;
      }

      client.data['userId'] = payload.sub;
      client.data['clubId'] = payload.activeClubId;

      // Auto-join all club channels
      const channels = await this.chatService.listChannels(payload.activeClubId);
      for (const channel of channels) {
        await client.join(`club:${payload.activeClubId}:channel:${channel.id}`);
      }

      this.logger.log(
        `Connected: ${client.id} (user ${payload.sub}, club ${payload.activeClubId})`,
      );
    } catch (err) {
      this.logger.warn(
        `Connection rejected — invalid token: ${(err as Error).message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; content: string },
  ) {
    try {
      const userId = client.data['userId'] as string | undefined;
      const clubId = client.data['clubId'] as string | undefined;

      if (!userId || !clubId) {
        client.emit('chat:error', { message: 'Not authenticated' });
        return { error: 'Not authenticated' };
      }

      if (!data?.channelId || !data?.content?.trim()) {
        client.emit('chat:error', { message: 'Invalid message payload' });
        return { error: 'Invalid message payload' };
      }

      const message = await this.chatService.createMessage(
        data.channelId,
        userId,
        clubId,
        data.content.trim(),
      );

      // Broadcast to all members in the channel room
      this.server
        .to(`club:${clubId}:channel:${data.channelId}`)
        .emit('chat:message', message);

      return message;
    } catch (err) {
      const errMsg = (err as Error).message;
      client.emit('chat:error', { message: errMsg });
      return { error: errMsg };
    }
  }

  @SubscribeMessage('chat:join-channel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    try {
      const clubId = client.data['clubId'] as string | undefined;

      if (!clubId) {
        client.emit('chat:error', { message: 'Not authenticated' });
        return { error: 'Not authenticated' };
      }

      await this.chatService.verifyChannelBelongsToClub(data.channelId, clubId);
      await client.join(`club:${clubId}:channel:${data.channelId}`);
      client.emit('chat:channel-joined', { channelId: data.channelId });
    } catch (err) {
      client.emit('chat:error', { message: (err as Error).message });
    }
  }
}
