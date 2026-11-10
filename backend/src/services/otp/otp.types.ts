export interface OtpProvider {
  name: string;
  sendOtp(phone: string): Promise<{ success: boolean; sessionInfo?: string }>;
  verifyOtp(phone: string, code: string, sessionInfo?: string): Promise<boolean>;
}
