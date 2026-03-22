import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@org/api-core';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

const mockJwtService = {
  verify: vi.fn(),
};

const mockPrismaService = {
  clubMember: {
    findFirst: vi.fn(),
  },
};

const mockChatService = {
  listChannels: vi.fn(),
  createMessage: vi.fn(),
  verifyChannelBelongsToClub: vi.fn(),
};

function createMockSocket(overrides: Record<string, unknown> = {}) {
  const base = {
    id: 'socket-1',
    data: {} as Record<string, unknown>,
    handshake: {
      auth: { token: 'valid-token' },
      headers: {},
    },
    disconnect: vi.fn(),
    join: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn(),
  };
  return { ...base, ...overrides };
}

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ChatService, useValue: mockChatService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);

    // Set a default server mock
    (gateway as unknown as { server: unknown }).server = {
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    };
  });

  describe('handleConnection', () => {
    it('disconnects client if no token provided', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, headers: {} },
      });

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('disconnects client if JWT is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });
      const client = createMockSocket();

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('disconnects client if user is not a club member', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'a@b.com',
        activeClubId: 'club-1',
        role: 'MEMBER',
      });
      mockPrismaService.clubMember.findFirst.mockResolvedValue(null);
      const client = createMockSocket();

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('disconnects suspended member', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'a@b.com',
        activeClubId: 'club-1',
        role: 'MEMBER',
      });
      mockPrismaService.clubMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
        status: 'SUSPENDED',
      });
      const client = createMockSocket();

      await gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('stores userId and clubId on client.data for valid connection', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'a@b.com',
        activeClubId: 'club-1',
        role: 'MEMBER',
      });
      mockPrismaService.clubMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
        status: 'ACTIVE',
      });
      mockChatService.listChannels.mockResolvedValue([
        { id: 'ch-1', name: 'General', clubId: 'club-1', createdAt: '', updatedAt: '' },
      ]);

      const client = createMockSocket();

      await gateway.handleConnection(client as never);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.data['userId']).toBe('user-1');
      expect(client.data['clubId']).toBe('club-1');
      // Should join the club-scoped channel room
      expect(client.join).toHaveBeenCalledWith('club:club-1:channel:ch-1');
    });
  });

  describe('handleSendMessage', () => {
    it('returns error if client is not authenticated', async () => {
      const client = createMockSocket({ data: {} as Record<string, unknown> });

      const result = await gateway.handleSendMessage(client as never, {
        channelId: 'ch-1',
        content: 'Hello',
      });

      expect(result).toEqual({ error: 'Not authenticated' });
    });

    it('broadcasts message to channel room on success', async () => {
      const clientData: Record<string, unknown> = {
        userId: 'user-1',
        clubId: 'club-1',
      };
      const client = createMockSocket({ data: clientData });

      const fakeMessage = {
        id: 'msg-1',
        channelId: 'ch-1',
        content: 'Hello',
        imageUrl: null,
        userId: 'user-1',
        senderName: 'Alice Dupont',
        senderAvatar: null,
        createdAt: '2026-01-01T12:00:00.000Z',
      };
      mockChatService.createMessage.mockResolvedValue(fakeMessage);

      const serverEmitMock = vi.fn();
      const serverToMock = vi.fn().mockReturnValue({ emit: serverEmitMock });
      (gateway as unknown as { server: { to: typeof serverToMock } }).server = {
        to: serverToMock,
      };

      await gateway.handleSendMessage(client as never, {
        channelId: 'ch-1',
        content: 'Hello',
      });

      // Verify message was broadcast to correct club-scoped room
      expect(serverToMock).toHaveBeenCalledWith('club:club-1:channel:ch-1');
      expect(serverEmitMock).toHaveBeenCalledWith('chat:message', fakeMessage);
    });
  });
});
