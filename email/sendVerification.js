const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendVerificationEmail(email, token, username = 'User', linkOverride = null, isReset = false) {
  try {
    const actionLink = linkOverride || `${process.env.BASE_URL}/auth/verify?token=${token}`;
    const subject = isReset
      ? 'Reset Your Password - Pet Care Management'
      : 'Verify Your Email Address - Pet Care Management';

    const htmlContent = isReset
      ? `
        <h2>Password Reset</h2>
        <p>Hello ${username},</p>
        <p>Please click the button below to reset your password. This link is valid for 1 hour.</p>
        <p><a href="${actionLink}" style="background:#4CAF50;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">Reset Password</a></p>
        <p>If you didn’t request this, ignore this email.</p>
      `
      : `
        <h2>Email Verification</h2>
        <p>Hello ${username},</p>
        <p>Click below to verify your account:</p>
        <p><a href="${actionLink}" style="background:#4CAF50;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">Verify Email</a></p>
        <p>If you didn’t create an account, ignore this email.</p>
      `;

    // const msg = {
    //   to: email,
    //   from: { email: process.env.EMAIL_USER, name: 'Pet Care Management' },
    //   subject,
    //   html: htmlContent
    // };

    const msg = {
      to: email,
      from: `Pet Care Management <${process.env.EMAIL_USER}>`,
      subject,
      html: htmlContent
    };


    await sgMail.send(msg);
    console.log(`✅ Email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
}

module.exports = sendVerificationEmail;