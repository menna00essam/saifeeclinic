const twilio = require('twilio');
const { convert } = require('html-to-text');
const smsConfig = require('../config/sms');

class SMSService {
  constructor() {
    if (smsConfig.provider === 'twilio') {
      this.client = twilio(smsConfig.accountSid, smsConfig.authToken);
    }
  }

  // ✅ Send SMS via Twilio (with HTML-to-text conversion)
  async sendSMS({ to, message }) {
    try {
      if (smsConfig.provider === 'twilio') {
        const plainTextMessage = convert(message, {
          wordwrap: false,
          selectors: [
            { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
            { selector: 'img', format: 'skip' }
          ]
        });

        const result = await this.client.messages.create({
          body: plainTextMessage,
          from: smsConfig.fromNumber,
          to: to
        });

        console.log('SMS sent successfully:', result.sid);
        return result;
      } else {
        console.log('SMS provider not configured');
        return null;
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  // ✅ Format phone number for Egypt
  formatEgyptianPhone(phone) {
    phone = phone.replace(/\D/g, '');

    if (phone.startsWith('01') && phone.length === 11) {
      return `+2${phone}`;
    } else if (phone.startsWith('2') && phone.length === 12) {
      return `+${phone}`;
    } else if (phone.startsWith('+2')) {
      return phone;
    }

    return phone;
  }

  // ✅ Send multiple SMS
  async sendBulkSMS(smsList) {
    try {
      const results = [];

      for (const smsData of smsList) {
        try {
          const formattedPhone = this.formatEgyptianPhone(smsData.to);
          const result = await this.sendSMS({
            ...smsData,
            to: formattedPhone
          });
          results.push({ success: true, messageId: result?.sid, to: smsData.to });
        } catch (error) {
          results.push({ success: false, error: error.message, to: smsData.to });
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      throw error;
    }
  }
}

module.exports = new SMSService();
