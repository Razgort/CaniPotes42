import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, GoneException, NotFoundException } from '@nestjs/common';
import { InviteService } from './invite.service.js';

describe('InviteService', () => {
  let service: InviteService;
  let prisma: Record<string, any>;
  let mailService: { sendInvitation: ReturnType<typeof vi.fn> };

  const clubId = 'club-uuid-1';
  const mockClub = { name: "Cani'Potes 42", logo: null };

  beforeEach(() => {
    prisma = {
      club: { findUnique: vi.fn() },
      invitation: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      clubMember: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mailService = { sendInvitation: vi.fn().mockResolvedValue(undefined) };

    service = new InviteService(prisma as any, mailService as any);
  });

  describe('createInvitations', () => {
    it('should create invitations and send emails', async () => {
      prisma.club.findUnique.mockResolvedValue(mockClub);
      prisma.invitation.findUnique.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue({
        id: 'inv-1',
        token: 'token-uuid-1',
        clubId,
        email: 'new@example.com',
      });

      const result = await service.createInvitations(clubId, {
        emails: ['new@example.com'],
      });

      expect(result.sent).toBe(1);
      expect(result.duplicates).toHaveLength(0);
      expect(mailService.sendInvitation).toHaveBeenCalledOnce();
    });

    it('should detect duplicate invitations', async () => {
      prisma.club.findUnique.mockResolvedValue(mockClub);
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-existing',
        acceptedAt: null,
      });

      const result = await service.createInvitations(clubId, {
        emails: ['already@invited.com'],
      });

      expect(result.sent).toBe(0);
      expect(result.duplicates).toEqual(['already@invited.com']);
      expect(mailService.sendInvitation).not.toHaveBeenCalled();
    });

    it('should handle batch invitations with mix of new and duplicates', async () => {
      prisma.club.findUnique.mockResolvedValue(mockClub);
      prisma.invitation.findUnique
        .mockResolvedValueOnce(null) // new
        .mockResolvedValueOnce({ id: 'dup', acceptedAt: null }); // duplicate
      prisma.invitation.create.mockResolvedValue({
        id: 'inv-1',
        token: 'token-1',
        clubId,
        email: 'new@example.com',
      });

      const result = await service.createInvitations(clubId, {
        emails: ['new@example.com', 'dup@example.com'],
      });

      expect(result.sent).toBe(1);
      expect(result.duplicates).toEqual(['dup@example.com']);
    });

    it('should throw NotFoundException for missing club', async () => {
      prisma.club.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvitations('nonexistent', { emails: ['test@example.com'] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInvitationStatus', () => {
    const baseInvitation = {
      id: 'inv-1',
      email: 'user@example.com',
      club: { name: "Cani'Potes 42", logo: null },
    };

    it('should return valid for active invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        ...baseInvitation,
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });

      const result = await service.getInvitationStatus('valid-token');
      expect(result.status).toBe('valid');
      expect(result.clubName).toBe("Cani'Potes 42");
    });

    it('should return expired for past-expiry invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        ...baseInvitation,
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 86400000),
      });

      const result = await service.getInvitationStatus('expired-token');
      expect(result.status).toBe('expired');
    });

    it('should return already_accepted for used invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        ...baseInvitation,
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      const result = await service.getInvitationStatus('used-token');
      expect(result.status).toBe('already_accepted');
    });

    it('should throw NotFoundException for missing token', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.getInvitationStatus('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('acceptInvitation', () => {
    const userId = 'user-uuid-1';

    it('should create club membership for valid invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        clubId,
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        club: { id: clubId, name: "Cani'Potes 42" },
      });
      prisma.clubMember.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.acceptInvitation('valid-token', userId);
      expect(result.clubId).toBe(clubId);
      expect(result.alreadyMember).toBe(false);
    });

    it('should handle already-member case gracefully', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        clubId,
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        club: { id: clubId, name: "Cani'Potes 42" },
      });
      prisma.clubMember.findUnique.mockResolvedValue({ id: 'existing-member' });
      prisma.invitation.update.mockResolvedValue({});

      const result = await service.acceptInvitation('valid-token', userId);
      expect(result.alreadyMember).toBe(true);
    });

    it('should throw GoneException for expired invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        clubId,
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 86400000),
        club: { id: clubId, name: "Cani'Potes 42" },
      });

      await expect(
        service.acceptInvitation('expired-token', userId),
      ).rejects.toThrow(GoneException);
    });

    it('should throw ConflictException for already-accepted invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        clubId,
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        club: { id: clubId, name: "Cani'Potes 42" },
      });

      await expect(
        service.acceptInvitation('used-token', userId),
      ).rejects.toThrow(ConflictException);
    });
  });
});
