import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvitationController } from './invitation.controller.js';
import { InviteService } from './invite.service.js';

describe('InvitationController', () => {
  let controller: InvitationController;
  let inviteService: {
    createInvitations: ReturnType<typeof vi.fn>;
    getInvitationStatus: ReturnType<typeof vi.fn>;
    acceptInvitation: ReturnType<typeof vi.fn>;
    acceptInvitationByToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    inviteService = {
      createInvitations: vi.fn(),
      getInvitationStatus: vi.fn(),
      acceptInvitation: vi.fn(),
      acceptInvitationByToken: vi.fn(),
    };

    controller = new InvitationController(inviteService as any);
  });

  describe('createInvitations', () => {
    it('should create invitations and return sent count', async () => {
      inviteService.createInvitations.mockResolvedValue({
        sent: 2,
        duplicates: [],
      });

      const result = await controller.createInvitations('club-1', {
        emails: ['a@example.com', 'b@example.com'],
      });

      expect(result.sent).toBe(2);
      expect(inviteService.createInvitations).toHaveBeenCalledWith('club-1', {
        emails: ['a@example.com', 'b@example.com'],
      });
    });
  });

  describe('getInvitationStatus', () => {
    it('should return invitation status', async () => {
      inviteService.getInvitationStatus.mockResolvedValue({
        clubName: "Cani'Potes 42",
        email: 'user@example.com',
        status: 'valid',
      });

      const result = await controller.getInvitationStatus('token-123');
      expect(result.status).toBe('valid');
    });
  });

  describe('acceptInvitation', () => {
    it('should redirect unauthenticated users to register', async () => {
      inviteService.acceptInvitationByToken.mockResolvedValue({
        clubId: 'club-1',
        email: 'user@example.com',
        valid: true,
      });

      const mockReq = { headers: {} } as any;
      const result = await controller.acceptInvitation('token-123', mockReq);

      expect(result.redirectTo).toBe('/register');
      expect(result.token).toBe('token-123');
    });

    it('should return invalid status for expired token without auth', async () => {
      inviteService.acceptInvitationByToken.mockResolvedValue({
        clubId: '',
        email: '',
        valid: false,
      });

      const mockReq = { headers: {} } as any;
      const result = await controller.acceptInvitation('bad-token', mockReq);

      expect(result.status).toBe('invalid');
    });
  });
});
