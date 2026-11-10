import { sendOtp as twilioSend, verifyOtp as twilioVerify } from '../twilio.service';
import { OtpProvider } from './otp.types';

export const twilioProvider: OtpProvider = {
  name: 'twilio',

  async sendOtp(phone: string): Promise<{ success: boolean; sessionInfo?: string }> {
    await twilioSend(phone);
    return { success: true };
  },

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    return twilioVerify(phone, code);
  },
};
