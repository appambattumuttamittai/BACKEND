import { getConfig } from '../../config';
import { OtpProvider } from './otp.types';
import { msg91Provider } from './msg91.provider';
import { firebaseProvider } from './firebase.provider';
import { twilioProvider } from './twilio.provider';

export * from './otp.types';
export { msg91Provider } from './msg91.provider';
export { firebaseProvider } from './firebase.provider';
export { twilioProvider } from './twilio.provider';

export function getOtpProvider(): OtpProvider {
  const config = getConfig();
  const provider = (config.OTP_PROVIDER || 'firebase').toLowerCase();

  switch (provider) {
    case 'msg91':
      return msg91Provider;
    case 'twilio':
      return twilioProvider;
    case 'firebase':
    default:
      return firebaseProvider;
  }
}

export async function sendOtp(phone: string): Promise<{ success: boolean; sessionInfo?: string }> {
  const provider = getOtpProvider();
  console.log(`[OTP Service] Sending OTP via provider: ${provider.name}`);
  return provider.sendOtp(phone);
}

export async function verifyOtp(phone: string, code: string, sessionInfo?: string): Promise<boolean> {
  const provider = getOtpProvider();
  console.log(`[OTP Service] Verifying OTP via provider: ${provider.name}`);
  return provider.verifyOtp(phone, code, sessionInfo);
}
