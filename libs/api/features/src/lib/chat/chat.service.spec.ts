import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';

const mockPrisma = {
  chatChannel: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  chatMessage: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
};

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: 'PrismaService', useValue: mockPrisma },
      ],
    })
      .overrideProvider(
        // Use the string token NestJS resolves to
        'PrismaService',
      )
      .useValue(mockPrisma)
      .compile();

    service = module.get<ChatService>(ChatService);
    // Inject prisma directly since NestJS DI uses class token
    (service as unknown as { prisma: typeof mockPrisma }).prisma = mockPrisma;
  });

  describe('listChannels', () => {
    it('returns channels scoped to the clubId', async () => {
      const clubId = 'club-1';
      const fakeChannel = {
        id: 'ch-1',
        clubId,
        name: 'General',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      mockPrisma.chatChannel.findMany.mockResolvedValue([fakeChannel]);

      const result = await service.listChannels(clubId);

      expect(mockPrisma.chatChannel.findMany).toHaveBeenCalledWith({
        where: { clubId },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ch-1');
      expect(result[0].name).toBe('General');
    });
  });

  describe('verifyChannelBelongsToClub', () => {
    it('throws NotFoundException if channel is not in the club', async () => {
      mockPrisma.chatChannel.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyChannelBelongsToClub('ch-999', 'club-1'),
      ).rejects.toThrow(NotFoundException);

      // Verify the query always scopes by clubId (tenant isolation)
      expect(mockPrisma.chatChannel.findFirst).toHaveBeenCalledWith({
        where: { id: 'ch-999', clubId: 'club-1' },
      });
    });

    it('returns the channel if it belongs to the club', async () => {
      const fakeChannel = { id: 'ch-1', clubId: 'club-1', name: 'General' };
      mockPrisma.chatChannel.findFirst.mockResolvedValue(fakeChannel);

      const result = await service.verifyChannelBelongsToClub('ch-1', 'club-1');
      expect(result).toEqual(fakeChannel);
    });
  });

  describe('createMessage', () => {
    it('creates a message with correct data and returns mapped DTO', async () => {
      const channelId = 'ch-1';
      const userId = 'user-1';
      const clubId = 'club-1';
      const content = 'Hello world';

      mockPrisma.chatChannel.findFirst.mockResolvedValue({
        id: channelId,
        clubId,
        name: 'General',
      });

      const fakeMessage = {
        id: 'msg-1',
        channelId,
        content,
        imageUrl: null,
        userId,
        createdAt: new Date('2026-01-01T12:00:00Z'),
        user: {
          id: userId,
          firstName: 'Alice',
          lastName: 'Dupont',
          avatarUrl: null,
        },
      };
      mockPrisma.chatMessage.create.mockResolvedValue(fakeMessage);

      const result = await service.createMessage(channelId, userId, clubId, content);

      // Verify channel is verified before creating message (tenant isolation)
      expect(mockPrisma.chatChannel.findFirst).toHaveBeenCalledWith({
        where: { id: channelId, clubId },
      });

      expect(result.id).toBe('msg-1');
      expect(result.senderName).toBe('Alice Dupont');
      expect(result.content).toBe(content);
      expect(result.channelId).toBe(channelId);
    });

    it('throws NotFoundException if channel does not belong to club', async () => {
      mockPrisma.chatChannel.findFirst.mockResolvedValue(null);

      await expect(
        service.createMessage('ch-999', 'user-1', 'club-1', 'test'),
      ).rejects.toThrow(NotFoundException);

      // Message must NOT be created when channel validation fails
      expect(mockPrisma.chatMessage.create).not.toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('returns messages in chronological order', async () => {
      const channelId = 'ch-1';
      const clubId = 'club-1';

      mockPrisma.chatChannel.findFirst.mockResolvedValue({
        id: channelId,
        clubId,
        name: 'General',
      });

      const msg1 = {
        id: 'msg-1',
        channelId,
        content: 'First',
        imageUrl: null,
        userId: 'user-1',
        createdAt: new Date('2026-01-01T12:00:00Z'),
        user: { id: 'user-1', firstName: 'Alice', lastName: 'A', avatarUrl: null },
      };
      const msg2 = {
        id: 'msg-2',
        channelId,
        content: 'Second',
        imageUrl: null,
        userId: 'user-2',
        createdAt: new Date('2026-01-01T12:01:00Z'),
        user: { id: 'user-2', firstName: 'Bob', lastName: 'B', avatarUrl: null },
      };

      // Prisma returns in desc order, service reverses
      mockPrisma.chatMessage.findMany.mockResolvedValue([msg2, msg1]);

      const result = await service.getMessages(channelId, clubId);

      // Should be reversed to chronological order
      expect(result[0].id).toBe('msg-1');
      expect(result[1].id).toBe('msg-2');
    });
  });

  describe('ensureGeneralChannel', () => {
    it('creates General channel if it does not exist', async () => {
      const clubId = 'club-1';
      mockPrisma.chatChannel.findFirst.mockResolvedValue(null);
      mockPrisma.chatChannel.create.mockResolvedValue({
        id: 'ch-new',
        clubId,
        name: 'General',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.ensureGeneralChannel(clubId);

      expect(mockPrisma.chatChannel.create).toHaveBeenCalledWith({
        data: { clubId, name: 'General' },
      });
    });

    it('returns existing channel without creating a new one', async () => {
      const clubId = 'club-1';
      const existing = { id: 'ch-1', clubId, name: 'General' };
      mockPrisma.chatChannel.findFirst.mockResolvedValue(existing);

      const result = await service.ensureGeneralChannel(clubId);

      expect(mockPrisma.chatChannel.create).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });
  });
});
