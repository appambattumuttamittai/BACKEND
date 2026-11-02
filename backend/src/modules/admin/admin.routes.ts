import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { isAdminAuthenticated } from '../auth/auth.service';
import { updateOrderStatusSchema, orderFiltersSchema } from './admin.schema';
import {
  getDashboardStats,
  getOrders,
  updateOrderStatus,
  exportOrdersCsv,
  getDailyChartData,
} from './admin.service';
import { OrderStatus } from '@prisma/client';
import { getConfig } from '../../config';
import { z } from 'zod';

// Middleware to protect all admin routes
async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!isAdminAuthenticated(request)) {
    return reply.status(401).send({ error: 'Unauthorized. Admin login required.' });
  }
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAdmin);

  // Dashboard stats
  fastify.get('/stats', async (_request, reply) => {
    const stats = await getDashboardStats(fastify.prisma);
    return reply.send(stats);
  });

  // Orders list with filters
  fastify.get('/orders', async (request, reply) => {
    const result = orderFiltersSchema.safeParse(request.query);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid filters' });
    }
    const data = await getOrders(fastify.prisma, result.data);
    return reply.send(data);
  });

  // Single order detail (admin sees full data)
  fastify.get('/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await fastify.prisma.order.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!order) return reply.status(404).send({ error: 'Order not found' });
    return reply.send({
      ...order,
      phone: order.phone.slice(0, 2) + '****' + order.phone.slice(-4),
    });
  });

  // Update order status
  fastify.patch('/orders/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = updateOrderStatusSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid status value' });
    }
    try {
      const order = await updateOrderStatus(
        fastify.prisma,
        id,
        result.data.status as OrderStatus,
        result.data.adminNotes
      );
      return reply.send(order);
    } catch {
      return reply.status(404).send({ error: 'Order not found' });
    }
  });

  // Export CSV
  fastify.get('/export/csv', async (request, reply) => {
    const { status, dateFrom, dateTo } = request.query as Record<string, string>;
    const csv = await exportOrdersCsv(fastify.prisma, { status, dateFrom, dateTo });
    const filename = `muttamittai-orders-${new Date().toISOString().split('T')[0]}.csv`;
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send('\uFEFF' + csv);
  });

  // Charts data
  fastify.get('/charts', async (_request, reply) => {
    const data = await getDailyChartData(fastify.prisma);
    return reply.send(data);
  });

  // Google Sheets URL (secure - admin only)
  fastify.get('/sheets-url', async (_request, reply) => {
    const config = getConfig();
    return reply.send({ url: config.GOOGLE_SHEETS_URL || null });
  });

  // Product management (admin)
  fastify.get('/products', async (_request, reply) => {
    const products = await fastify.prisma.product.findMany({
      orderBy: { weightGrams: 'asc' },
    });
    return reply.send(products);
  });

  // ── Feedback management (admin) ──────────────────────────────

  // GET all feedbacks (approved + pending)
  fastify.get('/feedback', async (request, reply) => {
    const { approved } = request.query as { approved?: string };
    const where = approved !== undefined ? { isApproved: approved === 'true' } : {};
    const feedbacks = await fastify.prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(feedbacks);
  });

  // PATCH approve/reject a feedback
  fastify.patch('/feedback/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({ isApproved: z.boolean() });
    const result = schema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: 'isApproved (boolean) required' });
    try {
      const feedback = await fastify.prisma.feedback.update({
        where: { id },
        data: { isApproved: result.data.isApproved },
      });
      return reply.send(feedback);
    } catch {
      return reply.status(404).send({ error: 'Feedback not found' });
    }
  });

  // DELETE a feedback
  fastify.delete('/feedback/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await fastify.prisma.feedback.delete({ where: { id } });
      return reply.send({ success: true });
    } catch {
      return reply.status(404).send({ error: 'Feedback not found' });
    }
  });
};

export default adminRoutes;

// Middleware to protect all admin routes
async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!isAdminAuthenticated(request)) {
    return reply.status(401).send({ error: 'Unauthorized. Admin login required.' });
  }
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAdmin);

  // Dashboard stats
  fastify.get('/stats', async (_request, reply) => {
    const stats = await getDashboardStats(fastify.prisma);
    return reply.send(stats);
  });

  // Orders list with filters
  fastify.get('/orders', async (request, reply) => {
    const result = orderFiltersSchema.safeParse(request.query);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid filters' });
    }
    const data = await getOrders(fastify.prisma, result.data);
    return reply.send(data);
  });

  // Single order detail (admin sees full data)
  fastify.get('/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await fastify.prisma.order.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!order) return reply.status(404).send({ error: 'Order not found' });
    // Admin sees masked phone only
    return reply.send({
      ...order,
      phone: order.phone.slice(0, 2) + '****' + order.phone.slice(-4),
    });
  });

  // Update order status
  fastify.patch('/orders/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = updateOrderStatusSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid status value' });
    }
    try {
      const order = await updateOrderStatus(
        fastify.prisma,
        id,
        result.data.status as OrderStatus,
        result.data.adminNotes
      );
      return reply.send(order);
    } catch {
      return reply.status(404).send({ error: 'Order not found' });
    }
  });

  // Export CSV
  fastify.get('/export/csv', async (request, reply) => {
    const { status, dateFrom, dateTo } = request.query as Record<string, string>;
    const csv = await exportOrdersCsv(fastify.prisma, { status, dateFrom, dateTo });
    const filename = `muttamittai-orders-${new Date().toISOString().split('T')[0]}.csv`;
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send('\uFEFF' + csv); // BOM for Excel UTF-8 compatibility
  });

  // Charts data
  fastify.get('/charts', async (_request, reply) => {
    const data = await getDailyChartData(fastify.prisma);
    return reply.send(data);
  });

  // Google Sheets URL (secure - admin only)
  fastify.get('/sheets-url', async (_request, reply) => {
    const config = getConfig();
    return reply.send({ url: config.GOOGLE_SHEETS_URL || null });
  });

  // Product management (admin)
  fastify.get('/products', async (_request, reply) => {
    const products = await fastify.prisma.product.findMany({
      orderBy: { weightGrams: 'asc' },
    });
    return reply.send(products);
  });
};

export default adminRoutes;
