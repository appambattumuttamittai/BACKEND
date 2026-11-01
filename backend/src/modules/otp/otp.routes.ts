import { FastifyPluginAsync } from 'fastify';
import { sendOtpSchema, verifyOtpSchema } from './otp.schema';
import { initiateOtp, validateOtp } from './otp.service';

const otpRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/send',
    { config: { rateLimit: { max: 3, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const result = sendOtpSchema.safeParse(request.body);
      if (!result.success) {
        return reply
          .status(400)
          .send({ error: result.error.errors[0]?.message || 'Invalid phone number' });
      }

      try {
        const sessionId = await initiateOtp(fastify.prisma, result.data.phone);
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

  fastify.post(
    '/verify',
    { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } },
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
