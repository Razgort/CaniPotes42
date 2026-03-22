import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service.js';

@Module({
  imports: [
    MailerModule.forRoot({
      transport:
        process.env['NODE_ENV'] === 'production'
          ? {
              host: process.env['SMTP_HOST'],
              port: Number(process.env['SMTP_PORT'] ?? 587),
              auth: {
                user: process.env['SMTP_USER'],
                pass: process.env['SMTP_PASS'],
              },
            }
          : {
              // Dev: use jsonTransport to log emails to stdout
              jsonTransport: true,
            },
      defaults: {
        from: process.env['SMTP_FROM'] ?? 'noreply@canifed.app',
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
