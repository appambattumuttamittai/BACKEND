"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtp = sendOtp;
exports.verifyOtp = verifyOtp;
const twilio_1 = __importDefault(require("twilio"));
const config_1 = require("../config");
let _client = null;
function getClient() {
    if (!_client) {
        const config = (0, config_1.getConfig)();
        _client = (0, twilio_1.default)(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    }
    return _client;
}
async function sendOtp(phone) {
    const config = (0, config_1.getConfig)();
    const client = getClient();
    await client.verify.v2
        .services(config.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: `+91${phone}`, channel: 'sms' });
}
async function verifyOtp(phone, code) {
    const config = (0, config_1.getConfig)();
    const client = getClient();
    try {
        const result = await client.verify.v2
            .services(config.TWILIO_VERIFY_SERVICE_SID)
            .verificationChecks.create({ to: `+91${phone}`, code });
        return result.status === 'approved';
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=twilio.service.js.map