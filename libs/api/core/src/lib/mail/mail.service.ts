import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface InvitationEmailData {
  to: string;
  clubName: string;
  clubLogo: string | null;
  inviteToken: string;
  frontendUrl: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailer: MailerService) {}

  async sendInvitation(data: InvitationEmailData): Promise<void> {
    const inviteUrl = `${data.frontendUrl}/invite/${data.inviteToken}`;

    try {
      await this.mailer.sendMail({
        to: data.to,
        subject: `Vous êtes invité à rejoindre ${data.clubName} sur CaniFed`,
        html: this.buildInvitationHtml(data.clubName, data.clubLogo, inviteUrl),
      });
      this.logger.log(`Invitation email sent to ${data.to} for club ${data.clubName}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${data.to}: ${(error as Error).message}`);
      throw error;
    }
  }

  private buildInvitationHtml(
    clubName: string,
    clubLogo: string | null,
    inviteUrl: string,
  ): string {
    const logoHtml = clubLogo
      ? `<img src="${clubLogo}" alt="${clubName}" style="max-height:64px;margin-bottom:16px;" />`
      : '';

    return `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        ${logoHtml}
        <h2 style="color:#18181B;margin-bottom:8px;">Rejoignez ${clubName} sur CaniFed</h2>
        <p style="color:#71717A;line-height:1.5;">
          Vous avez été invité à rejoindre le club <strong>${clubName}</strong>.
          Cliquez sur le bouton ci-dessous pour accepter l'invitation.
        </p>
        <a href="${inviteUrl}"
           style="display:inline-block;background:#3B82F6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:24px 0;">
          Rejoindre le club
        </a>
        <p style="color:#A1A1AA;font-size:12px;margin-top:24px;">
          Cette invitation expire dans 7 jours.
        </p>
      </div>
    `;
  }
}
