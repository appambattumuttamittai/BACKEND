import * as bcrypt from 'bcryptjs';
import { getConfig } from '../../config';
import { FastifyRequest } from 'fastify';

export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const config = getConfig();
  if (username !== config.ADMIN_USERNAME) return false;
  try {
    return await bcrypt.compare(password, config.ADMIN_PASSWORD_HASH);
  } catch {
    return false;
  }
}

export function isAdminAuthenticated(request: FastifyRequest): boolean {
  const session = request.session as unknown as Record<string, unknown>;
  return session?.adminAuthenticated === true;
}
