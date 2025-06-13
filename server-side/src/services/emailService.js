// src/services/emailService.js

const nodemailer = require('nodemailer');
const { emailConfig } = require('../config/email');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Send basic email
  async sendEmail({ to, subject, html, text, attachments = [] }) {
    try {
      const mailOptions = {
        from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Send templated email for notifications
  async sendNotificationEmail(notification) {
    try {
      const emailData = {
        to: notification.user_id.email,
        subject: notification.title,
        html: this.wrapInTemplate(notification.message, notification.title),
      };

      return await this.sendEmail(emailData);
    } catch (error) {
      console.error('Error sending notification email:', error);
      throw error;
    }
  }

  // Convert HTML to plain text
  htmlToText(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Wrap message in template
  wrapInTemplate(message, title) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .footer { text-align: center; margin-top: 20px; padding: 10px; color: #666; font-size: 12px; }
          ul { list-style-type: none; padding: 0; }
          li { padding: 5px 0; }
          strong { color: #4CAF50; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Medical Clinic</h1>
        </div>
        <div class="content">
          ${message}
        </div>
        <div class="footer">
          <p>This is an automated message from Medical Clinic Management System</p>
          <p>Please do not reply to this email</p>
        </div>
      </body>
      </html>
    `;
  }

  // Send multiple emails
  async sendBulkEmails(emailList) {
    const results = [];

    for (const emailData of emailList) {
      try {
        const result = await this.sendEmail(emailData);
        results.push({ success: true, messageId: result.messageId, to: emailData.to });
      } catch (error) {
        results.push({ success: false, error: error.message, to: emailData.to });
      }
    }

    return results;
  }

  // Send Contact Form Submission Email
  async sendContactFormNotification({ name, email, phone, subject, message }) {
    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.CONTACT_RECEIVER_EMAIL,
      subject: `New Contact Form: ${subject}`,
      html: `
        <h2>New Message from Contact Form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Contact form email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending contact form email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
