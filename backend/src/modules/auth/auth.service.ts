import * as bcrypt from 'bcryptjs';
import { getConfig } from '../../config';
import { FastifyRequest } from 'fastify';

async function matchesPassword(
  inputPass: string,
  configuredHash?: string,
  configuredPlain?: string
): Promise<boolean> {
  // 1. Direct plain-text match (e.g. if ADMIN_PASSWORD or ADMIN_2_PASSWORD is set)
  if (configuredPlain && inputPass === configuredPlain) {
    return true;
  }

  if (!configuredHash) {
    return false;
  }

  // 2. If configuredHash is a standard bcrypt hash ($2a$, $2b$, $2y$)
  if (
    configuredHash.startsWith('$2a$') ||
    configuredHash.startsWith('$2b$') ||
    configuredHash.startsWith('$2y$')
  ) {
    try {
      const match = await bcrypt.compare(inputPass, configuredHash);
      if (match) return true;
    } catch {
      // ignore invalid bcrypt format
    }
  }

  // 3. Fallback: in case the user entered a plain password directly in the HASH variable in Render
  if (inputPass === configuredHash) {
    return true;
  }

  return false;
}

export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const config = getConfig();
  const trimmedUser = username.trim().toLowerCase();

  // Check Admin 1
  if (
    config.ADMIN_USERNAME &&
    trimmedUser === config.ADMIN_USERNAME.trim().toLowerCase()
  ) {
    return matchesPassword(
      password,
      config.ADMIN_PASSWORD_HASH,
      config.ADMIN_PASSWORD
    );
  }

  // Check Admin 2 (if configured in environment variables)
  if (
    config.ADMIN_2_USERNAME &&
    trimmedUser === config.ADMIN_2_USERNAME.trim().toLowerCase()
  ) {
    return matchesPassword(
      password,
      config.ADMIN_2_PASSWORD_HASH,
      config.ADMIN_2_PASSWORD
    );
  }

  return false;
}

export function isAdminAuthenticated(request: FastifyRequest): boolean {
  const session = request.session as unknown as Record<string, unknown>;
  return session?.adminAuthenticated === true;
}
