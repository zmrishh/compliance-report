import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private readonly client: Resend | null = null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const domain = this.configService.get<string>('APP_DOMAIN', 'localhost');

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is not set — email notifications are disabled. Set RESEND_API_KEY in .env to enable them.',
      );
    } else {
      this.client = new Resend(apiKey);
    }

    this.from = `Compliance Readiness <noreply@${domain}>`;
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.client) return;

    try {
      const result = await this.client.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });

      if (result.error) {
        this.logger.warn(`Email delivery failed for ${to}: ${result.error.message}`);
      }
    } catch (err) {
      // Never let email failure propagate — log and continue
      this.logger.error(`Failed to send email to ${to}`, err);
    }
  }
}
