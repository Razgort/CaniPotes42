import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard, ClubGuard } from '@org/api-core';
import type { JwtPayload } from '@org/api-core';

const mockChatService = {
  listChannels: vi.fn(),
  getMessages: vi.fn(),
  getHistory: vi.fn(),
  getMissedMessages: vi.fn(),
  createMessage: vi.fn(),
  uploadImage: vi.fn(),
};

const mockServerEmit = vi.fn();
const mockServerTo = vi.fn().mockReturnValue({ emit: mockServerEmit });

const mockChatGateway = {
  server: { to: mockServerTo },
};

const mockUser: JwtPayload = {
  sub: 'user-1',
  email: 'alice@example.com',
  activeClubId: 'club-1',
  role: 'MEMBER',
  iat: 0,
  exp: 0,
};

describe('ChatController', () => {
  let controller: ChatController;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockServerTo.mockReturnValue({ emit: mockServerEmit });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: mockChatService },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ClubGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatController>(ChatController);
    (controller as unknown as { chatService: unknown }).chatService = mockChatService;
    (controller as unknown as { chatGateway: unknown }).chatGateway = mockChatGateway;
  });

  describe('GET /channels/:channelId/messages', () => {
    const clubId = 'club-1';
    const channelId = 'ch-1';

    it('returns missed messages (200) when valid since param is provided', async () => {
      const since = '2026-01-01T12:00:00.000Z';
      const fakeMissed = {
        data: [
          {
            id: 'msg-2',
            channelId,
            content: 'Missed',
            imageUrl: null,
            userId: 'user-1',
            senderName: 'Alice A',
            senderAvatar: null,
            createdAt: '2026-01-01T12:01:00.000Z',
          },
        ],
      };
      mockChatService.getMissedMessages.mockResolvedValue(fakeMissed);

      const result = await controller.getMessages(clubId, channelId, since);

      expect(mockChatService.getMissedMessages).toHaveBeenCalledWith(
        channelId,
        new Date(since),
        clubId,
      );
      expect(result).toEqual(fakeMissed);
    });

    it('throws BadRequestException (400) when since is not valid ISO8601', async () => {
      await expect(
        controller.getMessages(clubId, channelId, 'not-a-date'),
      ).rejects.toThrow(BadRequestException);

      expect(mockChatService.getMissedMessages).not.toHaveBeenCalled();
    });

    it('throws BadRequestException (400) when since is a partial date (no time)', async () => {
      await expect(
        controller.getMessages(clubId, channelId, '2026-01-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns latest messages when no params provided', async () => {
      const fakeMessages = [{ id: 'msg-1', content: 'Hello' }];
      mockChatService.getMessages.mockResolvedValue(fakeMessages);

      const result = await controller.getMessages(clubId, channelId);

      expect(mockChatService.getMessages).toHaveBeenCalledWith(channelId, clubId, 50);
      expect(result).toEqual(fakeMessages);
    });

    it('uses cursor-based pagination when cursor param is provided', async () => {
      const cursor = '2026-01-01T10:00:00.000Z';
      const fakeHistory = { data: [], meta: { hasMore: false, nextCursor: null } };
      mockChatService.getHistory.mockResolvedValue(fakeHistory);

      const result = await controller.getMessages(clubId, channelId, undefined, cursor);

      expect(mockChatService.getHistory).toHaveBeenCalledWith(channelId, clubId, 50, cursor);
      expect(result).toEqual(fakeHistory);
    });
  });

  describe('POST /channels/:channelId/messages/image', () => {
    const validFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
      size: 1024,
      stream: null as never,
      destination: '',
      filename: '',
      path: '',
    };

    it('throws 400 when no file is provided', async () => {
      await expect(
        controller.uploadImage('club-1', mockUser, 'ch-1', undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws 400 when file exceeds 5MB', async () => {
      const bigFile = { ...validFile, size: 6 * 1024 * 1024 };
      await expect(
        controller.uploadImage('club-1', mockUser, 'ch-1', bigFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns the created message on success (200)', async () => {
      const fakeMessage = {
        id: 'msg-1',
        channelId: 'ch-1',
        content: '',
        imageUrl: 'https://r2.example.com/club-1/chat/ch-1/uuid.jpg',
        userId: 'user-1',
        senderName: 'Alice Dupont',
        senderAvatar: null,
        createdAt: '2026-01-01T12:00:00.000Z',
      };
      mockChatService.uploadImage.mockResolvedValue(fakeMessage);

      const result = await controller.uploadImage('club-1', mockUser, 'ch-1', validFile);

      expect(result).toEqual(fakeMessage);
      expect(mockChatService.uploadImage).toHaveBeenCalledWith(
        'ch-1',
        'user-1',
        'club-1',
        validFile,
      );
    });

    it('broadcasts chat:message via WebSocket after successful upload', async () => {
      const fakeMessage = {
        id: 'msg-1',
        channelId: 'ch-1',
        content: '',
        imageUrl: 'https://r2.example.com/img.jpg',
        userId: 'user-1',
        senderName: 'Alice',
        senderAvatar: null,
        createdAt: '2026-01-01T12:00:00.000Z',
      };
      mockChatService.uploadImage.mockResolvedValue(fakeMessage);

      await controller.uploadImage('club-1', mockUser, 'ch-1', validFile);

      expect(mockServerTo).toHaveBeenCalledWith('club:club-1:channel:ch-1');
      expect(mockServerEmit).toHaveBeenCalledWith('chat:message', fakeMessage);
    });
  });
});
