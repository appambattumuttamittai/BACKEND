import axios from 'axios';
import { getConfig } from '../../config';
import { OtpProvider } from './otp.types';

export const msg91Provider: OtpProvider = {
  name: 'msg91',

  async sendOtp(phone: string): Promise<{ success: boolean; sessionInfo?: string }> {
    const config = getConfig();
    if (!config.MSG91_AUTH_KEY || !config.MSG91_TEMPLATE_ID) {
      throw new Error('MSG91_CONFIG_MISSING: Please configure MSG91_AUTH_KEY and MSG91_TEMPLATE_ID');
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const mobileWithCountry = cleanPhone.startsWith('91') && cleanPhone.length === 12
      ? cleanPhone
      : `91${cleanPhone}`;

    try {
      const response = await axios.post(
        'https://control.msg91.com/api/v5/otp',
        {
          template_id: config.MSG91_TEMPLATE_ID,
          mobile: mobileWithCountry,
          otp_expiry: config.MSG91_OTP_EXPIRY_MINUTES || 10,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authkey: config.MSG91_AUTH_KEY,
          },
          timeout: 10000,
        }
      );

      if (response.data && (response.data.type === 'success' || response.status === 200)) {
        return { success: true };
      }

      throw new Error(response.data?.message || 'MSG91 OTP send failed');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send OTP via MSG91';
      console.error('[MSG91 Error]', errorMsg);
      throw new Error(errorMsg);
    }
  },

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const config = getConfig();
    if (!config.MSG91_AUTH_KEY) {
      throw new Error('MSG91_CONFIG_MISSING: Please configure MSG91_AUTH_KEY');
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const mobileWithCountry = cleanPhone.startsWith('91') && cleanPhone.length === 12
      ? cleanPhone
      : `91${cleanPhone}`;

    try {
      const response = await axios.get(
        `https://control.msg91.com/api/v5/otp/verify?otp=${encodeURIComponent(code)}&mobile=${encodeURIComponent(mobileWithCountry)}`,
        {
          headers: {
            authkey: config.MSG91_AUTH_KEY,
          },
          timeout: 10000,
        }
      );

      if (response.data && response.data.type === 'success') {
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('[MSG91 Verify Error]', err.response?.data || err.message);
      return false;
    }
  },
};
