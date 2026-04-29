import { NextResponse } from 'next/server';
import { otpStore } from '@/lib/otp';

export async function POST(request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const stored = otpStore.get(normalizedEmail);

    if (!stored) {
      return NextResponse.json(
        { error: 'No OTP found. Please request a new one.' },
        { status: 400 }
      );
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(normalizedEmail);
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (stored.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP. Please check and try again.' },
        { status: 400 }
      );
    }

    // OTP verified — clean up
    otpStore.delete(normalizedEmail);

    return NextResponse.json({
      ok: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('verify-otp error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
