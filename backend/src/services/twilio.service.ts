import twilio from 'twilio';
import { getConfig } from '../config';

let _client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!_client) {
    const config = getConfig();
    _client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

export async function sendOtp(phone: string): Promise<void> {
  const config = getConfig();
  const client = getClient();
  await client.verify.v2
    .services(config.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to: `+91${phone}`, channel: 'sms' });
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const config = getConfig();
  const client = getClient();
  try {
    const result = await client.verify.v2
      .services(config.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: `+91${phone}`, code });
    return result.status === 'approved';
  } catch {
    return false;
  }
}
