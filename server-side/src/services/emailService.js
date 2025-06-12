const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});


const sendContactFormNotification = async ({ name, email, phone, subject, message }) => {
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

  await transporter.sendMail(mailOptions);
};

module.exports = { sendContactFormNotification };
