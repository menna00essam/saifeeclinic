const twilio = require('twilio');
const smsConfig = require('../config/sms');


class SMSService {
  
  constructor() {
    if (smsConfig.provider === 'twilio') {
      this.client = twilio(smsConfig.accountSid, smsConfig.authToken);
    }
  }

  // Send SMS via Twilio
  async sendSMS({ to, message }) {
    try {
      if (smsConfig.provider === 'twilio') {
        const result = await this.client.messages.create({
          body: message,
          from: smsConfig.fromNumber,
          to: to
        });
        
        console.log('SMS sent successfully:', result.sid);
        return result;
      } else {
        // Add other SMS providers here (e.g., local Egyptian SMS services)
        console.log('SMS provider not configured');
        return null;
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  // Format phone number for Egypt
  formatEgyptianPhone(phone) {
    // Remove any non-digit characters
    phone = phone.replace(/\D/g, '');
    
    // Handle Egyptian phone numbers
    if (phone.startsWith('01') && phone.length === 11) {
      return `+2${phone}`;
    } else if (phone.startsWith('2') && phone.length === 12) {
      return `+${phone}`;
    } else if (phone.startsWith('+2')) {
      return phone;
    }
    
    return phone;
  }

  // Send bulk SMS
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