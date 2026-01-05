/**
 * Email Service
 * 
 * Handles all email communications:
 * - Welcome emails
 * - Password reset
 * - Email verification
 * - Notifications
 */

const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    /**
     * Send welcome email to new users
     */
    async sendWelcomeEmail(user) {
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Welcome to GoalForge!</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.full_name},</h2>
            <p>Welcome to GoalForge - your personal development companion!</p>
            <p>We're excited to have you on board. Here's what you can do:</p>
            <ul>
              <li>✅ Track daily habits and build streaks</li>
              <li>🎯 Set and achieve long-term goals</li>
              <li>👥 Connect with friends and compete</li>
              <li>⚔️ Join challenges and climb leaderboards</li>
              <li>💻 Track progress across 8 life domains</li>
            </ul>
            <a href="${process.env.CLIENT_URL}/dashboard" class="button">Get Started</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Happy goal-crushing!</p>
            <p><strong>The GoalForge Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2026 GoalForge. All rights reserved.</p>
            <p>You received this email because you signed up for GoalForge.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        return this.send({
            to: user.email,
            subject: 'Welcome to GoalForge! 🎯',
            html
        });
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.full_name},</h2>
            <p>We received a request to reset your password for your GoalForge account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link expires in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            <p>If you have any concerns, contact our support team immediately.</p>
            <p><strong>The GoalForge Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2026 GoalForge. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        return this.send({
            to: user.email,
            subject: 'Reset Your GoalForge Password',
            html
        });
    }

    /**
     * Send email verification
     */
    async sendVerificationEmail(user, verificationToken) {
        const verifyUrl = `${process.env.CLIENT_URL}/verify?token=${verificationToken}`;

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Verify Your Email</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.full_name},</h2>
            <p>Thanks for signing up for GoalForge! Please verify your email address to activate your account.</p>
            <a href="${verifyUrl}" class="button">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
            <p>This link expires in 24 hours.</p>
            <p><strong>The GoalForge Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2026 GoalForge. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        return this.send({
            to: user.email,
            subject: 'Verify Your GoalForge Email',
            html
        });
    }

    /**
     * Send streak milestone notification
     */
    async sendStreakMilestone(user, streak) {
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
          .streak { font-size: 72px; font-weight: bold; color: #f59e0b; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔥 Streak Milestone Achieved!</h1>
          </div>
          <div class="content">
            <h2>Congratulations, ${user.full_name}!</h2>
            <p>You've reached an incredible milestone:</p>
            <div class="streak">${streak} Days 🔥</div>
            <p>You're in the top ${streak >= 30 ? '1%' : streak >= 7 ? '10%' : '25%'} of GoalForge users!</p>
            <p>Keep up the amazing work. Your consistency is inspiring!</p>
            <a href="${process.env.CLIENT_URL}/dashboard" class="button">View Dashboard</a>
          </div>
          <div class="footer">
            <p>© 2026 GoalForge. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        return this.send({
            to: user.email,
            subject: `🔥 ${streak}-Day Streak Milestone!`,
            html
        });
    }

    /**
     * Generic send method
     */
    async send({ to, subject, html, text }) {
        try {
            const info = await this.transporter.sendMail({
                from: `"GoalForge" <${process.env.SMTP_USER}>`,
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
            });

            console.log('✅ Email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Email error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verify SMTP connection
     */
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ SMTP connection verified');
            return true;
        } catch (error) {
            console.error('❌ SMTP connection failed:', error);
            return false;
        }
    }
}

module.exports = new EmailService();
