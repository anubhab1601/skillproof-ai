import { NextResponse } from 'next/server';
import { otpStore, transporter, generateOTP } from '@/lib/otp';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP
    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    // Send email via Nodemailer
    await transporter.sendMail({
      from: `"SkillProof" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your SkillProof Verification Code',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #faf8ff;">
          <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e2e7ff; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
            <h1 style="color: #0623bb; font-size: 24px; font-weight: 800; margin: 0 0 8px;">SkillProof</h1>
            <p style="color: #454655; font-size: 14px; margin: 0 0 32px;">Performance-Based Hiring Marketplace</p>
            <p style="color: #131b2e; font-size: 16px; margin: 0 0 24px;">Your verification code is:</p>
            <div style="background: #eaedff; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0623bb;">${otp}</span>
            </div>
            <p style="color: #757686; font-size: 13px; margin: 0;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('send-otp error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
