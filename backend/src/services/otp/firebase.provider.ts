import axios from 'axios';
import { getConfig } from '../../config';
import { OtpProvider } from './otp.types';

export const firebaseProvider: OtpProvider = {
  name: 'firebase',

  async sendOtp(phone: string): Promise<{ success: boolean; sessionInfo?: string }> {
    const config = getConfig();
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = `+91${cleanPhone}`;

    // 1. If in Test Mode or no Firebase API Key configured, use testing handler
    if (config.FIREBASE_TEST_MODE || !config.FIREBASE_API_KEY) {
      return { success: true, sessionInfo: `test_session_${Date.now()}` };
    }

    // 2. Real Firebase Identity Toolkit Phone Auth via REST API
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${config.FIREBASE_API_KEY}`,
        {
          phoneNumber: formattedPhone,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      const sessionInfo = response.data?.sessionInfo;
      if (!sessionInfo) {
        throw new Error('Firebase did not return sessionInfo');
      }

      return { success: true, sessionInfo };
    } catch (err: any) {
      // If it's a test phone number configured in Firebase Console, or quota issue, handle gracefully
      const errorMsg = err.response?.data?.error?.message || err.message || 'Firebase OTP send failed';
      console.error('[Firebase Auth Error]', errorMsg);

      // If test mode is enabled as fallback or test OTP is configured
      if (config.FIREBASE_TEST_MODE || config.FIREBASE_TEST_OTP) {
        console.warn(`[Firebase Fallback] Real SMS unavailable (${errorMsg}). Falling back to test OTP code: ${config.FIREBASE_TEST_OTP}`);
        return { success: true, sessionInfo: `fallback_session_${Date.now()}` };
      }

      throw new Error(`Firebase Auth Error: ${errorMsg}`);
    }
  },

  async verifyOtp(phone: string, code: string, sessionInfo?: string): Promise<boolean> {
    const config = getConfig();

    // No test OTP or dummy code bypass allowed
    if (!config.FIREBASE_API_KEY) {
      return false;
    }

    // Real Firebase Identity Toolkit Verification
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${config.FIREBASE_API_KEY}`,
        {
          sessionInfo: sessionInfo || '',
          code: code.trim(),
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (response.data && (response.data.idToken || response.data.localId)) {
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('[Firebase Verify Error]', err.response?.data?.error?.message || err.message);
      return false;
    }
  },
};
