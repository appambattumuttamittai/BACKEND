import { FastifyPluginAsync } from 'fastify';
import { sendOtpSchema, verifyOtpSchema } from './otp.schema';
import { initiateOtp, validateOtp } from './otp.service';
import { notifyLeadEmail } from '../../services/email.service';
import { sendTelegramMessage } from '../../services/telegram.service';

const otpRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/send',
    { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const result = sendOtpSchema.safeParse(request.body);
      if (!result.success) {
        return reply
          .status(400)
          .send({ error: result.error.errors[0]?.message || 'Invalid details' });
      }

      try {
        const sessionId = await initiateOtp(
          fastify.prisma,
          result.data.phone,
          result.data.email,
          result.data.customerName
        );

        // Background lead alert to admin Gmail & Telegram
        if (result.data.customerName || result.data.email) {
          notifyLeadEmail({
            customerName: result.data.customerName || 'Customer',
            phone: result.data.phone,
            email: result.data.email,
          }).catch(() => {});

          const emailInfo = result.data.email ? `\n📧 <b>Email:</b> ${result.data.email}` : '';
          sendTelegramMessage(
            `🛒 <b>Customer on Order Page</b>\n\n👤 <b>Name:</b> ${result.data.customerName || 'Customer'}\n📱 <b>Phone:</b> <code>${result.data.phone}</code>${emailInfo}\n⏰ <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
          ).catch(() => {});
        }

        return reply.send({ success: true, sessionId });
      } catch (err: unknown) {
        if ((err as Error).message === 'TOO_MANY_REQUESTS') {
          return reply
            .status(429)
            .send({ error: 'Too many OTP requests. Please wait 5 minutes.' });
        }
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Failed to send OTP. Please try again.' });
      }
    }
  );

  /**
   * Background lead alert when customer enters name & mobile
   */
  fastify.post(
    '/lead',
    { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const { customerName, phone, email } = (request.body as { customerName?: string; phone?: string; email?: string }) || {};
      if (phone && phone.replace(/\D/g, '').length === 10) {
        const cleanPhone = phone.replace(/\D/g, '');
        notifyLeadEmail({ customerName: customerName || 'Customer', phone: cleanPhone, email }).catch(() => {});
        const emailInfo = email ? `\n📧 <b>Email:</b> ${email}` : '';
        sendTelegramMessage(
          `🛒 <b>Customer on Order Page</b>\n\n👤 <b>Name:</b> ${customerName || 'Customer'}\n📱 <b>Phone:</b> <code>${cleanPhone}</code>${emailInfo}\n⏰ <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
        ).catch(() => {});
      }
      return reply.send({ success: true });
    }
  );

  fastify.post(
    '/verify',
    { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } },
    async (request, reply) => {
      const result = verifyOtpSchema.safeParse(request.body);
      if (!result.success) {
        return reply
          .status(400)
          .send({ error: result.error.errors[0]?.message || 'Invalid input' });
      }

      const { phone, code, sessionId } = result.data;
      const { valid, sessionId: verifiedId } = await validateOtp(
        fastify.prisma,
        phone,
        code,
        sessionId
      );

      if (!valid) {
        return reply.status(400).send({ error: 'Invalid or expired OTP. Please try again.' });
      }

      return reply.send({ success: true, verified: true, sessionId: verifiedId });
    }
  );
};

export default otpRoutes;
