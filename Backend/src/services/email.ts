import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { logger } from '@/utils/logger';
import { config } from '@/config';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private emailConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Try Gmail/SMTP first
    if (config.EMAIL_USER && config.EMAIL_PASS) {
      this.setupSMTP();
    }
    
    // Try Resend as fallback
    if (config.RESEND_API_KEY) {
      this.setupResend();
    }

    if (!this.emailConfigured) {
      logger.warn('No email service configured. Email functionality will be disabled.');
    }
  }

  private setupSMTP(): void {
    try {
      const emailUser = config.EMAIL_USER || '';
      const emailPass = config.EMAIL_PASS || '';

      if (!emailUser || !emailPass) {
        logger.warn('SMTP credentials not provided');
        return;
      }

      // Detect email provider and set appropriate settings
      let smtpConfig: any; // Use any to avoid nodemailer type issues
      
      if (emailUser.includes('@gmail.com')) {
        smtpConfig = {
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        };
        logger.info('Email service initialized with Gmail SMTP');
      } else if (emailUser.includes('@outlook.com') || emailUser.includes('@hotmail.com')) {
        smtpConfig = {
          service: 'hotmail',
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        };
        logger.info('Email service initialized with Outlook SMTP');
      } else if (emailUser.includes('@yahoo.com')) {
        smtpConfig = {
          service: 'yahoo',
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        };
        logger.info('Email service initialized with Yahoo SMTP');
      } else {
        // Custom SMTP configuration
        smtpConfig = {
          host: config.EMAIL_HOST || 'smtp.gmail.com',
          port: parseInt(config.EMAIL_PORT || '587'),
          secure: config.EMAIL_SECURE === 'true',
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        };
        logger.info(`Email service initialized with SMTP (${config.EMAIL_HOST || 'smtp.gmail.com'})`);
      }

      this.transporter = nodemailer.createTransport(smtpConfig);
      this.emailConfigured = true;
    } catch (error) {
      logger.error('Failed to setup SMTP:', error);
    }
  }

  private setupResend(): void {
    try {
      if (config.RESEND_API_KEY) {
        this.resend = new Resend(config.RESEND_API_KEY);
        if (!this.emailConfigured) {
          this.emailConfigured = true;
          logger.info('Email service initialized with Resend');
        }
      }
    } catch (error) {
      logger.error('Failed to setup Resend:', error);
    }
  }

  private async sendWithResend(options: EmailOptions): Promise<boolean> {
    if (!this.resend) return false;

    try {
      // Use a simplified approach for Resend to avoid type issues
      const emailData = {
        from: config.FROM_EMAIL || 'AI Notes <onboarding@resend.dev>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      if (options.text) {
        (emailData as any).text = options.text;
      }

      await this.resend.emails.send(emailData as any);
      return true;
    } catch (error) {
      logger.error('Resend email failed:', error);
      return false;
    }
  }

  private async sendWithSMTP(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.sendMail({
        from: `"AI Notes" <${config.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      return true;
    } catch (error) {
      logger.error('SMTP email failed:', error);
      return false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.emailConfigured) {
      logger.warn('Email service not configured');
      return false;
    }

    // Try SMTP first, then Resend as fallback
    if (this.transporter) {
      const smtpSuccess = await this.sendWithSMTP(options);
      if (smtpSuccess) return true;
    }

    if (this.resend) {
      return await this.sendWithResend(options);
    }

    return false;
  }

  async sendVerificationEmail(email: string, code: string, name: string): Promise<boolean> {
    const subject = 'Verify Your Email - AI Notes';
    const html = this.getVerificationEmailTemplate(code, name);
    const text = `Hi ${name},\n\nYour verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nBest regards,\nAI Notes Team`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  async sendPasswordResetEmail(email: string, resetToken: string, name: string): Promise<boolean> {
    const resetUrl = `${config.APP_URL}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Password - AI Notes';
    const html = this.getPasswordResetEmailTemplate(resetUrl, name);
    const text = `Hi ${name},\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nBest regards,\nAI Notes Team`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const subject = 'Welcome to AI Notes!';
    const html = this.getWelcomeEmailTemplate(name);
    const text = `Hi ${name},\n\nWelcome to AI Notes! Your account has been successfully created.\n\nGet started: ${config.APP_URL}/login\n\nBest regards,\nAI Notes Team`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  private getVerificationEmailTemplate(code: string, name: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .code { font-size: 32px; font-weight: bold; color: #007bff; text-align: center; margin: 20px 0; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AI Notes</h1>
              <h2>Verify Your Email</h2>
            </div>
            <p>Hi ${name},</p>
            <p>Thank you for signing up for AI Notes! Please use the verification code below to complete your registration:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 10 minutes for security reasons.</p>
            <p>If you didn't create an account with AI Notes, please ignore this email.</p>
            <div class="footer">
              <p>Best regards,<br>The AI Notes Team</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(resetUrl: string, name: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AI Notes</h1>
              <h2>Reset Your Password</h2>
            </div>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
            <div class="footer">
              <p>Best regards,<br>The AI Notes Team</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getWelcomeEmailTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AI Notes</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .get-started { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AI Notes</h1>
              <h2>Welcome!</h2>
            </div>
            <p>Hi ${name},</p>
            <p>Welcome to AI Notes! Your account has been successfully created and verified.</p>
            <p>You can now start creating and organizing your notes with the power of AI assistance.</p>
            <div style="text-align: center;">
              <a href="${config.APP_URL}/login" class="get-started">Start Taking Notes</a>
            </div>
            <p>Features you can explore:</p>
            <ul>
              <li>Create and organize notes with colors</li>
              <li>AI-powered text summarization</li>
              <li>Grammar and spell checking</li>
              <li>Voice-to-text conversion</li>
              <li>Real-time sync across devices</li>
            </ul>
            <div class="footer">
              <p>Need help? Visit our <a href="${config.APP_URL}/help">Help Center</a></p>
              <p>Best regards,<br>The AI Notes Team</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  isConfigured(): boolean {
    return this.emailConfigured;
  }
}

// Export singleton instance
export const emailService = new EmailService();