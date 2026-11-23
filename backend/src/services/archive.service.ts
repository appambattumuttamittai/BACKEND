import { PrismaClient } from '@prisma/client';
import { getConfig } from '../config';

// ── CSV Generator ────────────────────────────────────────────────
function buildCsv(
  orders: Array<{
    id: string;
    customerName: string;
    phone: string;
    quantity: number;
    totalAmount: number;
    status: string;
    streetAddress: string | null;
    city: string | null;
    pincode: string | null;
    createdAt: Date;
    paidAt: Date | null;
    adminNotes: string | null;
    product: { weight: string; weightGrams: number };
  }>
): string {
  const header =
    'Order ID,Customer Name,Phone,Weight,Qty,Amount,Status,Street Address,City,Pincode,Date,Paid At,Admin Notes\n';
  const rows = orders.map((o) =>
    [
      o.id,
      `"${o.customerName.replace(/"/g, '""')}"`,
      o.phone,
      o.product.weight,
      o.quantity,
      o.totalAmount,
      o.status,
      `"${(o.streetAddress || '').replace(/"/g, '""')}"`,
      `"${(o.city || '').replace(/"/g, '""')}"`,
      o.pincode || '',
      new Date(o.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      o.paidAt ? new Date(o.paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
      `"${(o.adminNotes || '').replace(/"/g, '""')}"`,
    ].join(',')
  );
  // BOM for Excel UTF-8 support
  return '\uFEFF' + header + rows.join('\n');
}

// ── Send CSV document to Telegram ────────────────────────────────
async function sendCsvToTelegram(
  csv: string,
  filename: string,
  caption: string
): Promise<number | null> {
  const config = getConfig();
  if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_CHAT_ID) return null;

  try {
    const buffer = Buffer.from(csv, 'utf-8');
    const blob = new Blob([buffer], { type: 'text/csv' });

    const form = new FormData();
    form.append('chat_id', config.TELEGRAM_CHAT_ID);
    form.append('caption', caption);
    form.append('document', blob, filename);

    const res = await fetch(
      `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendDocument`,
      { method: 'POST', body: form }
    );
    const json = (await res.json()) as { ok: boolean; result?: { message_id: number } };
    if (json.ok && json.result) return json.result.message_id;
  } catch (err) {
    console.error('[Archive] Telegram send failed:', (err as Error).message);
  }
  return null;
}

// ── Check if archive is due (30-day check) ───────────────────────
export async function shouldRunArchive(prisma: PrismaClient): Promise<boolean> {
  const cfg = await prisma.appConfig.findUnique({ where: { key: 'LAST_ARCHIVE_DATE' } });
  if (!cfg) return true; // Never archived → run now
  const daysSince = (Date.now() - new Date(cfg.value).getTime()) / 86_400_000;
  return daysSince >= 30;
}

// ── Main archive runner ───────────────────────────────────────────
export async function runMonthlyArchive(prisma: PrismaClient): Promise<{
  success: boolean;
  orderCount: number;
  message: string;
}> {
  console.log('[Archive] Starting monthly archive…');

  const orders = await prisma.order.findMany({
    include: { product: true },
    orderBy: { createdAt: 'asc' },
  });

  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Always update the last-run date so we don't loop
  await prisma.appConfig.upsert({
    where: { key: 'LAST_ARCHIVE_DATE' },
    update: { value: now.toISOString() },
    create: { key: 'LAST_ARCHIVE_DATE', value: now.toISOString() },
  });

  if (orders.length === 0) {
    console.log('[Archive] No orders to archive.');
    return { success: true, orderCount: 0, message: 'No orders to archive. Database already empty.' };
  }

  const fromDate = orders[0].createdAt;
  const toDate = orders[orders.length - 1].createdAt;
  const paidCount = orders.filter((o) => o.status === 'PAID').length;
  const totalRevenue = orders.filter((o) => o.status === 'PAID').reduce((s, o) => s + o.totalAmount, 0);

  const csv = buildCsv(orders);
  const filename = `muttamittai-archive-${now.toISOString().split('T')[0]}.csv`;
  const caption =
    `📦 *Mutta Mittai — Monthly Archive*\n` +
    `📅 Date: ${dateLabel}\n` +
    `📊 Total Orders: ${orders.length}\n` +
    `✅ Paid: ${paidCount}  |  💰 Revenue: ₹${totalRevenue}\n` +
    `🗂 Period: ${fromDate.toLocaleDateString('en-IN')} → ${toDate.toLocaleDateString('en-IN')}\n\n` +
    `_Database cleared after this archive._`;

  const telegramMsgId = await sendCsvToTelegram(csv, filename, caption);

  // Store archive record in DB
  await prisma.archive.create({
    data: {
      orderCount: orders.length,
      paidCount,
      fromDate,
      toDate,
      csvData: csv,
      telegramMsgId,
    },
  });

  // Delete all orders (cascade-safe — no FK deps pointing TO Order that would block)
  await prisma.order.deleteMany({});

  console.log(`[Archive] ✅ Archived ${orders.length} orders, cleared DB. Telegram msg: ${telegramMsgId}`);
  return {
    success: true,
    orderCount: orders.length,
    message: `Archived ${orders.length} orders & cleared database. Telegram message sent.`,
  };
}

// ── Start the daily midnight-IST cron checker ─────────────────────
export function startArchiveCron(prisma: PrismaClient): void {
  // Check once at startup (handles server restarts after a gap)
  setTimeout(async () => {
    if (await shouldRunArchive(prisma)) {
      await runMonthlyArchive(prisma).catch((e) =>
        console.error('[Archive] Startup check failed:', e)
      );
    }
  }, 30_000); // 30s after boot to let DB connections settle

  // Then check every 24 hours at midnight IST
  // Calculate ms until next midnight IST
  function msUntilMidnightIST(): number {
    const IST_OFFSET = 5.5 * 3600 * 1000;
    const nowIST = new Date(Date.now() + IST_OFFSET);
    const midnightIST = new Date(nowIST);
    midnightIST.setUTCHours(0, 0, 0, 0);
    midnightIST.setUTCDate(midnightIST.getUTCDate() + 1); // next midnight
    return midnightIST.getTime() - nowIST.getTime() - IST_OFFSET + IST_OFFSET;
  }

  function scheduleNextCheck(): void {
    const delay = msUntilMidnightIST();
    console.log(`[Archive] Next check in ${Math.round(delay / 3600000)}h`);
    setTimeout(async () => {
      if (await shouldRunArchive(prisma)) {
        await runMonthlyArchive(prisma).catch((e) =>
          console.error('[Archive] Scheduled run failed:', e)
        );
      }
      scheduleNextCheck(); // reschedule for next midnight
    }, delay);
  }

  scheduleNextCheck();
}
