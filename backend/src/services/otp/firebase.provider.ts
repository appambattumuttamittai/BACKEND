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
      console.log(`\n========================================`);
      console.log(`[Firebase Testing OTP Provider]`);
      console.log(`Phone: ${formattedPhone}`);
      console.log(`Test OTP Code: ${config.FIREBASE_TEST_OTP}`);
      console.log(`(Use this OTP code to verify during testing)`);
      console.log(`========================================\n`);
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

      // If test mode is enabled as fallback
      if (config.FIREBASE_TEST_MODE) {
        console.warn(`[Firebase Fallback] Falling back to test OTP: ${config.FIREBASE_TEST_OTP}`);
        return { success: true, sessionInfo: `fallback_session_${Date.now()}` };
      }

      throw new Error(`Firebase Auth Error: ${errorMsg}`);
    }
  },

  async verifyOtp(phone: string, code: string, sessionInfo?: string): Promise<boolean> {
    const config = getConfig();

    // 1. If in Test Mode or test code matches, accept instantly for testing
    if (config.FIREBASE_TEST_MODE || !config.FIREBASE_API_KEY) {
      const isTestMatch = code.trim() === config.FIREBASE_TEST_OTP.trim();
      if (isTestMatch) {
        console.log(`[Firebase Testing] Test OTP matched successfully for phone: ${phone}`);
        return true;
      }
      return false;
    }

    // 2. Also allow the configured test OTP even in non-test mode if specified
    if (config.FIREBASE_TEST_OTP && code.trim() === config.FIREBASE_TEST_OTP.trim()) {
      return true;
    }

    // 3. Real Firebase Identity Toolkit Verification
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
