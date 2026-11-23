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
import { runMonthlyArchive, shouldRunArchive } from '../../services/archive.service';

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
    // Build URL from GOOGLE_SHEETS_URL env, or construct from SPREADSHEET_ID if available
    const url = config.GOOGLE_SHEETS_URL ||
      (config.GOOGLE_SHEETS_SPREADSHEET_ID
        ? `https://docs.google.com/spreadsheets/d/${config.GOOGLE_SHEETS_SPREADSHEET_ID}/edit`
        : null);
    return reply.send({ url });
  });

  // ---- Product management (admin) ----

  fastify.get('/products', async (_request, reply) => {
    const products = await fastify.prisma.product.findMany({
      orderBy: { weightGrams: 'asc' },
    });
    return reply.send(products);
  });

  // Update product price/stock
  fastify.patch('/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      price: z.number().positive().optional(),
      inStock: z.boolean().optional(),
    });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid product data' });
    }
    try {
      const product = await fastify.prisma.product.update({
        where: { id },
        data: result.data,
      });
      return reply.send(product);
    } catch {
      return reply.status(404).send({ error: 'Product not found' });
    }
  });

  // ---- Feedback management (admin) ----

  // POST create a new feedback entry (admin-added review)
  fastify.post('/feedback', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      rating: z.number().int().min(1).max(5),
      message: z.string().min(1),
      isApproved: z.boolean().default(true),
    });
    const result = schema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: 'Invalid feedback data' });
    const feedback = await fastify.prisma.feedback.create({ data: result.data });
    return reply.send(feedback);
  });

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

  // ---- AppConfig management (admin) ----

  // GET all config entries
  fastify.get('/config', async (_request, reply) => {
    const configs = await fastify.prisma.appConfig.findMany();
    return reply.send(configs);
  });

  // GET single config entry by key
  fastify.get('/config/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const config = await fastify.prisma.appConfig.findUnique({ where: { key } });
    if (!config) return reply.status(404).send({ error: 'Config key not found' });
    return reply.send(config);
  });

  // PUT/upsert a config entry
  fastify.put('/config/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const schema = z.object({ value: z.string() });
    const result = schema.safeParse(request.body);
    if (!result.success) return reply.status(400).send({ error: 'value (string) required' });
    const config = await fastify.prisma.appConfig.upsert({
      where: { key },
      update: { value: result.data.value },
      create: { key, value: result.data.value },
    });
    return reply.send({ success: true, config });
  });
  // ---- Archive management (admin) ----

  // GET list of all past archives
  fastify.get('/archives', async (_request, reply) => {
    const archives = await fastify.prisma.archive.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        orderCount: true,
        paidCount: true,
        fromDate: true,
        toDate: true,
        telegramMsgId: true,
        // Exclude csvData from list (download separately)
      },
    });
    return reply.send(archives);
  });

  // GET download CSV of a specific archive
  fastify.get('/archives/:id/csv', async (request, reply) => {
    const { id } = request.params as { id: string };
    const archive = await fastify.prisma.archive.findUnique({ where: { id }, select: { csvData: true, createdAt: true } });
    if (!archive) return reply.status(404).send({ error: 'Archive not found' });
    const filename = `muttamittai-archive-${new Date(archive.createdAt).toISOString().split('T')[0]}.csv`;
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(archive.csvData);
  });

  // POST manually trigger archive now
  fastify.post('/archives/run', async (_request, reply) => {
    const result = await runMonthlyArchive(fastify.prisma);
    return reply.send(result);
  });

  // GET check archive status
  fastify.get('/archives/status', async (_request, reply) => {
    const cfg = await fastify.prisma.appConfig.findUnique({ where: { key: 'LAST_ARCHIVE_DATE' } });
    const lastDate = cfg ? new Date(cfg.value) : null;
    const daysSince = lastDate ? (Date.now() - lastDate.getTime()) / 86_400_000 : null;
    const isDue = await shouldRunArchive(fastify.prisma);
    return reply.send({ lastArchiveDate: lastDate, daysSince: daysSince ? Math.floor(daysSince) : null, isDue });
  });

};

export default adminRoutes;
