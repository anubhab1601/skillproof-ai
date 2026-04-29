import nodemailer from 'nodemailer';

// In-memory OTP store (use Redis/Firestore in production)
// Map<email, { otp: string, expiresAt: number }>
const otpStore = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export { otpStore, transporter, generateOTP };
