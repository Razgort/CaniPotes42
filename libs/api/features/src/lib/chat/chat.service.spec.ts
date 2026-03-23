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

const mockR2Service = {
  upload: vi.fn().mockResolvedValue('https://r2.example.com/signed'),
};

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { R2Service } from '../document/r2.service';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: 'PrismaService', useValue: mockPrisma },
        { provide: R2Service, useValue: mockR2Service },
      ],
    })
      .overrideProvider('PrismaService')
      .useValue(mockPrisma)
      .overrideProvider(R2Service)
      .useValue(mockR2Service)
      .compile();

    service = module.get<ChatService>(ChatService);
    // Inject prisma and r2 directly since NestJS DI uses class token
    (service as unknown as { prisma: typeof mockPrisma }).prisma = mockPrisma;
    (service as unknown as { r2Service: typeof mockR2Service }).r2Service = mockR2Service;
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

  describe('getMissedMessages', () => {
    const channelId = 'ch-1';
    const clubId = 'club-1';
    const since = new Date('2026-01-01T12:00:00Z');

    it('returns messages created after since, in chronological order', async () => {
      mockPrisma.chatChannel.findFirst.mockResolvedValue({
        id: channelId,
        clubId,
        name: 'General',
      });

      const msg1 = {
        id: 'msg-1',
        channelId,
        content: 'After',
        imageUrl: null,
        userId: 'user-1',
        createdAt: new Date('2026-01-01T12:01:00Z'),
        user: { id: 'user-1', firstName: 'Alice', lastName: 'A', avatarUrl: null },
      };
      mockPrisma.chatMessage.findMany.mockResolvedValue([msg1]);

      const result = await service.getMissedMessages(channelId, since, clubId);

      expect(mockPrisma.chatMessage.findMany).toHaveBeenCalledWith({
        where: { channelId, createdAt: { gt: since } },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('msg-1');
    });

    it('returns empty array when no messages after since', async () => {
      mockPrisma.chatChannel.findFirst.mockResolvedValue({
        id: channelId,
        clubId,
        name: 'General',
      });
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);

      const result = await service.getMissedMessages(channelId, since, clubId);

      expect(result.data).toHaveLength(0);
    });

    it('throws NotFoundException (cross-club rejection) if channel not in club', async () => {
      mockPrisma.chatChannel.findFirst.mockResolvedValue(null);

      await expect(
        service.getMissedMessages(channelId, since, 'other-club'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.chatMessage.findMany).not.toHaveBeenCalled();
    });
  });

  describe('uploadImage', () => {
    const channelId = 'ch-1';
    const clubId = 'club-1';
    const userId = 'user-1';
    const fakeFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake'),
      size: 512,
      stream: null as never,
      destination: '',
      filename: '',
      path: '',
    };

    it('uploads file to R2 and creates a ChatMessage with imageUrl', async () => {
      mockPrisma.chatChannel.findFirst.mockResolvedValue({ id: channelId, clubId, name: 'General' });
      const fakeMessage = {
        id: 'msg-1',
        channelId,
        content: '',
        imageUrl: 'https://r2.example.com/signed',
        userId,
        createdAt: new Date('2026-01-01T12:00:00Z'),
        user: { id: userId, firstName: 'Alice', lastName: 'Dupont', avatarUrl: null },
      };
      mockPrisma.chatMessage.create.mockResolvedValue(fakeMessage);
      mockR2Service.upload.mockResolvedValue('https://r2.example.com/signed');

      const result = await service.uploadImage(channelId, userId, clubId, fakeFile);

      // R2 key must be scoped to club/channel (tenant isolation)
      expect(mockR2Service.upload).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${clubId}/chat/${channelId}/`)),
        fakeFile.buffer,
        fakeFile.mimetype,
      );

      // Prisma message created with empty content and imageUrl
      expect(mockPrisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channelId,
            userId,
            content: '',
            imageUrl: 'https://r2.example.com/signed',
          }),
        }),
      );

      expect(result.imageUrl).toBe('https://r2.example.com/signed');
    });

    it('throws NotFoundException if channel does not belong to club', async () => {
      mockPrisma.chatChannel.findFirst.mockResolvedValue(null);

      await expect(
        service.uploadImage(channelId, userId, 'other-club', fakeFile),
      ).rejects.toThrow(NotFoundException);

      expect(mockR2Service.upload).not.toHaveBeenCalled();
      expect(mockPrisma.chatMessage.create).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    const channelId = 'ch-1';
    const clubId = 'club-1';

    const makeMsgRow = (id: string, date: string) => ({
      id,
      channelId,
      content: 'text',
      imageUrl: null,
      userId: 'user-1',
      createdAt: new Date(date),
      user: { id: 'user-1', firstName: 'Alice', lastName: 'A', avatarUrl: null },
    });

    beforeEach(() => {
      mockPrisma.chatChannel.findFirst.mockResolvedValue({ id: channelId, clubId, name: 'General' });
    });

    it('returns messages in chronological order with hasMore=false when ≤ limit results', async () => {
      const msgs = [
        makeMsgRow('msg-2', '2026-01-01T12:01:00Z'),
        makeMsgRow('msg-1', '2026-01-01T12:00:00Z'),
      ];
      mockPrisma.chatMessage.findMany.mockResolvedValue(msgs);

      const result = await service.getHistory(channelId, clubId, 50);

      expect(result.data[0].id).toBe('msg-1'); // chronological order
      expect(result.data[1].id).toBe('msg-2');
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeNull();
    });

    it('returns hasMore=true and nextCursor when more messages exist', async () => {
      // Return limit+1 messages to signal more available
      const baseDate = new Date('2026-01-01T12:00:00Z');
      const msgs = Array.from({ length: 51 }, (_, i) => {
        const d = new Date(baseDate.getTime() + i * 60_000); // +1 min each
        return makeMsgRow(`msg-${i}`, d.toISOString());
      });
      mockPrisma.chatMessage.findMany.mockResolvedValue(msgs);

      const result = await service.getHistory(channelId, clubId, 50);

      expect(result.data).toHaveLength(50);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).not.toBeNull();
    });

    it('scopes query by cursor when provided', async () => {
      const cursor = '2026-01-01T11:00:00.000Z';
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);

      await service.getHistory(channelId, clubId, 50, cursor);

      expect(mockPrisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { channelId, createdAt: { lt: new Date(cursor) } },
        }),
      );
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
