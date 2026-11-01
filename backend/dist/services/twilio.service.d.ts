export declare function sendOtp(phone: string): Promise<void>;
export declare function verifyOtp(phone: string, code: string): Promise<boolean>;
