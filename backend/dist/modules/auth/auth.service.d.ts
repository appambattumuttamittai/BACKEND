import { FastifyRequest } from 'fastify';
export declare function verifyAdminCredentials(username: string, password: string): Promise<boolean>;
export declare function isAdminAuthenticated(request: FastifyRequest): boolean;
