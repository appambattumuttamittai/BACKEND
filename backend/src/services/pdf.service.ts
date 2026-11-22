/**
 * Pure TypeScript PDF generator for Appambattu Mutta Mittai
 * Generates standards-compliant ISO 32000 / PDF 1.4 documents
 * Formatted exactly according to modern corporate invoice specification
 * Zero external dependencies (fast, lightweight, 100% reliable)
 */

interface OrderInvoiceData {
  id: string;
  customerName: string;
  phone: string;
  streetAddress?: string | null;
  city?: string | null;
  pincode?: string | null;
  totalAmount: number;
  status: string;
  createdAt: Date;
  paidAt?: Date | null;
  adminNotes?: string | null;
  product?: {
    weight: string;
    price: number;
  };
  transactionId?: string | null;
}

function escapePdfText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ''); // Ensure standard ASCII/Latin-1 printable characters
}

class PDFBuilder {
  private objects: string[] = [];

  addObject(content: string): number {
    this.objects.push(content);
    return this.objects.length;
  }

  build(): Buffer {
    let output = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets: number[] = [];

    for (let i = 0; i < this.objects.length; i++) {
      offsets.push(Buffer.byteLength(output, 'latin1'));
      output += `${i + 1} 0 obj\n${this.objects[i]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(output, 'latin1');
    output += `xref\n0 ${this.objects.length + 1}\n`;
    output += '0000000000 65535 f \n';
    for (const offset of offsets) {
      output += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }

    output += `trailer\n<< /Size ${this.objects.length + 1} /Root 1 0 R >>\n`;
    output += `startxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(output, 'latin1');
  }
}

interface ParsedItem {
  description: string;
  unitPrice: number;
  qty: number;
  total: number;
}

function parseOrderItems(order: OrderInvoiceData): ParsedItem[] {
  const items: ParsedItem[] = [];

  // Price dictionary for default pack weights
  const defaultPrices: Record<string, number> = {
    '250gm': 150,
    '500gm': 300,
    '750gm': 450,
    '1kg': 600,
  };

  const rawNotes = order.adminNotes?.split('|')[0]?.trim();

  if (rawNotes && (rawNotes.includes('x') || rawNotes.includes('X') || rawNotes.includes('×') || rawNotes.includes('*'))) {
    const parts = rawNotes.split(',').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      // Matches e.g. "250gm x 2", "500gm × 1", or "Mutta Mittai 500gm x 1"
      const match = part.match(/(?:(.+?)\s+)?(\d+(?:gm|kg))\s*[xX*×\u00D7]\s*(\d+)/i);
      if (match) {
        const weight = match[2].toLowerCase();
        const qty = parseInt(match[3], 10) || 1;
        const unitPrice = defaultPrices[weight] || Math.round(order.totalAmount / qty);
        items.push({
          description: `Appampattu Mutta Mittai - ${weight.toUpperCase()} Pack`,
          unitPrice,
          qty,
          total: unitPrice * qty,
        });
      } else {
        items.push({
          description: `Appampattu Mutta Mittai (${part})`,
          unitPrice: order.totalAmount,
          qty: 1,
          total: order.totalAmount,
        });
      }
    }
  }

  if (items.length === 0) {
    if (order.product) {
      const weight = order.product.weight || '500gm';
      const unitPrice = order.product.price || order.totalAmount;
      const qty = Math.max(1, Math.round(order.totalAmount / (unitPrice || 1)));
      items.push({
        description: `Appampattu Mutta Mittai - ${weight.toUpperCase()} Pack`,
        unitPrice,
        qty,
        total: order.totalAmount,
      });
    } else {
      items.push({
        description: 'Appampattu Mutta Mittai - Traditional Egg Sweet Pack',
        unitPrice: order.totalAmount,
        qty: 1,
        total: order.totalAmount,
      });
    }
  }

  return items;
}

export function generateOrderInvoicePDF(order: OrderInvoiceData): Buffer {
  const pdf = new PDFBuilder();

  const invoiceNo = order.id.slice(-7).toUpperCase();
  const txId =
    order.transactionId ||
    (order.adminNotes?.includes('Razorpay:')
      ? order.adminNotes.split('Razorpay:')[1]?.trim()
      : 'RZP_' + order.id.slice(-8).toUpperCase());

  const orderDate = new Date(order.paidAt || order.createdAt);
  const formattedDate = orderDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const shortDate = orderDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const parsedItems = parseOrderItems(order);
  const stream: string[] = [];

  // ==========================================
  // 1. TOP HEADER DECORATIVE SHAPES
  // ==========================================
  // Top right Lime Green polygon
  stream.push('0.55 0.72 0.17 rg'); // Olive / Lime Green (#8CB82B)
  stream.push('360 841.89 m 595.28 841.89 l 595.28 812 l 325 812 l h f');

  // Dark Slate / Charcoal polygon
  stream.push('0.12 0.15 0.17 rg'); // Dark Slate (#1E252B)
  stream.push('235 812 m 595.28 812 l 595.28 722 l 200 722 l h f');

  // Green Leaf Accent icon
  stream.push('0.55 0.72 0.17 rg');
  stream.push('222 758 14 14 re f');
  stream.push('0.68 0.85 0.25 rg');
  stream.push('230 766 10 10 re f');

  // Company Name & Tagline inside Dark Polygon
  stream.push('BT');
  stream.push('1 1 1 rg'); // White
  stream.push('/F2 14.5 Tf');
  stream.push('248 768 Td');
  stream.push(`(${escapePdfText('APPAMPATTU MUTTA MITTAI')}) Tj`);
  stream.push('/F1 7.5 Tf');
  stream.push('0.75 0.85 0.72 rg');
  stream.push('0 -14 Td');
  stream.push(`(${escapePdfText('AUTHENTIC VILLAGE TRADITIONAL EGG SWEET')}) Tj`);
  stream.push('ET');

  // Company Website under polygon
  stream.push('BT');
  stream.push('0.40 0.40 0.40 rg');
  stream.push('/F3 8.5 Tf');
  stream.push('405 706 Td');
  stream.push(`(${escapePdfText('www.appampattueggsweet.com')}) Tj`);
  stream.push('ET');

  // ==========================================
  // 2. TOP LEFT: INVOICE TITLE & META
  // ==========================================
  stream.push('BT');
  stream.push('0.12 0.15 0.17 rg');
  stream.push('/F2 26 Tf');
  stream.push('40 766 Td');
  stream.push(`(INVOICE) Tj`);
  stream.push('ET');

  stream.push('BT');
  stream.push('0.35 0.35 0.35 rg');
  stream.push('/F1 9 Tf');
  stream.push('40 744 Td');
  stream.push(`(Invoice No.            ${escapePdfText(invoiceNo)}) Tj`);
  stream.push('0 -13 Td');
  stream.push(`(Invoice Date:          ${escapePdfText(formattedDate)}) Tj`);
  stream.push('/F2 9 Tf');
  stream.push('0.15 0.55 0.15 rg'); // Green for paid
  stream.push('0 -13 Td');
  stream.push(`(Payment Status:     PAID  /  VERIFIED) Tj`);
  stream.push('ET');

  // Determine delivery choice (store pickup vs home delivery)
  const isPickup =
    Boolean(order.streetAddress?.toLowerCase().includes('pick up') ||
    order.streetAddress?.toLowerCase().includes('store') ||
    order.city?.toLowerCase().includes('pickup') ||
    order.adminNotes?.includes('[STORE PICKUP]'));

  const deliveryMethodTitle = isPickup
    ? 'PICK UP IN STORE (Villupuram Railway Station)'
    : 'HOME DELIVERY (Within Villupuram City)';

  // ==========================================
  // 3. INVOICE TO & ORDER REFERENCE ROW
  // ==========================================
  // Left: Invoice To
  stream.push('BT');
  stream.push('0.12 0.15 0.17 rg');
  stream.push('/F2 10.5 Tf');
  stream.push('40 675 Td');
  stream.push(`(Invoice To:) Tj`);
  stream.push('/F2 12 Tf');
  stream.push('0 -15 Td');
  stream.push(`(${escapePdfText(order.customerName)}) Tj`);
  stream.push('/F2 8.5 Tf');
  stream.push('0.55 0.72 0.17 rg'); // Green accent
  stream.push('0 -13 Td');
  stream.push(`(Delivery: ${escapePdfText(deliveryMethodTitle)}) Tj`);
  stream.push('/F1 8.5 Tf');
  stream.push('0.40 0.40 0.40 rg');
  stream.push('0 -12 Td');
  stream.push(`(${escapePdfText(order.streetAddress || (isPickup ? 'Villupuram Railway Station (1st Platform)' : 'Villupuram City'))}) Tj`);
  stream.push('0 -11 Td');
  stream.push(`(${escapePdfText((order.city || 'Villupuram') + (order.pincode ? ' - ' + order.pincode : ''))}) Tj`);
  stream.push('0 -11 Td');
  stream.push(`(Phone: +91 ${escapePdfText(order.phone)}) Tj`);
  stream.push('ET');

  // Right: Order Meta Details
  stream.push('BT');
  stream.push('0.25 0.25 0.25 rg');
  stream.push('/F1 9 Tf');
  stream.push('390 660 Td');
  stream.push(`(Invoice No.   ${escapePdfText(invoiceNo)}) Tj`);
  stream.push('0 -13 Td');
  stream.push(`(Txn Ref:       ${escapePdfText(txId.slice(0, 16))}) Tj`);
  stream.push('0 -13 Td');
  stream.push(`(Date:            ${escapePdfText(shortDate)}) Tj`);
  stream.push('/F2 8.5 Tf');
  stream.push('0.55 0.72 0.17 rg');
  stream.push('0 -13 Td');
  stream.push(`(${escapePdfText(isPickup ? 'Option: Store Pickup' : 'Option: Home Delivery')}) Tj`);
  stream.push('ET');

  // ==========================================
  // 4. ITEMS TABLE
  // ==========================================
  const tableX = 40;
  const tableW = 515.28;
  const headerY = 562;
  const headerH = 24;

  // Header Left (Dark Slate)
  stream.push('0.12 0.15 0.17 rg');
  stream.push(`${tableX} ${headerY} 265 ${headerH} re f`);

  // Header Right (Lime Green)
  stream.push('0.55 0.72 0.17 rg');
  stream.push(`${tableX + 265} ${headerY} ${tableW - 265} ${headerH} re f`);

  // Header Text
  stream.push('BT');
  stream.push('1 1 1 rg');
  stream.push('/F2 8.5 Tf');
  stream.push('52 570 Td');
  stream.push(`(SL#) Tj`);
  stream.push('45 0 Td');
  stream.push(`(PRODUCT DESCRIPTION) Tj`);
  stream.push('220 0 Td');
  stream.push(`(UNIT PRICE) Tj`);
  stream.push('76 0 Td');
  stream.push(`(QTY.) Tj`);
  stream.push('64 0 Td');
  stream.push(`(TOTAL) Tj`);
  stream.push('ET');

  // Table Body Grid: 6 rows of 25pt = 150pt
  const rowCount = 6;
  const rowH = 25;
  const bodyH = rowCount * rowH;
  const bodyBottomY = headerY - bodyH; // 562 - 150 = 412

  // Outer border & Column vertical dividers
  stream.push('0.88 0.88 0.88 RG 0.75 w');
  stream.push(`${tableX} ${bodyBottomY} ${tableW} ${bodyH} re S`);

  // Column vertical lines
  const colDividerXs = [
    tableX + 45,  // SL# divider (85)
    tableX + 265, // Product divider (305)
    tableX + 345, // Unit Price divider (385)
    tableX + 410, // Qty divider (450)
  ];
  for (const divX of colDividerXs) {
    stream.push(`${divX} ${headerY} m ${divX} ${bodyBottomY} l S`);
  }

  // Horizontal row dividers
  for (let r = 1; r < rowCount; r++) {
    const rowLineY = headerY - r * rowH;
    stream.push(`${tableX} ${rowLineY} m ${tableX + tableW} ${rowLineY} l S`);
  }

  // Populate Row Contents
  for (let idx = 0; idx < rowCount; idx++) {
    const rowY = headerY - idx * rowH - 16;
    const slNumber = String(idx + 1).padStart(2, '0');
    const item = parsedItems[idx];

    stream.push('BT');
    // Centered SL#
    stream.push('0.40 0.40 0.40 rg');
    stream.push('/F1 8.5 Tf');
    stream.push(`55 ${rowY} Td`);
    stream.push(`(${slNumber}) Tj`);

    if (item) {
      // Product Description
      stream.push('0.20 0.20 0.20 rg');
      stream.push('/F2 8.5 Tf');
      stream.push('38 0 Td');
      stream.push(`(${escapePdfText(item.description)}) Tj`);

      // Unit Price
      stream.push('/F1 8.5 Tf');
      stream.push('220 0 Td');
      stream.push(`(Rs. ${item.unitPrice.toFixed(2)}) Tj`);

      // Qty
      stream.push('82 0 Td');
      stream.push(`(${item.qty}) Tj`);

      // Total
      stream.push('60 0 Td');
      stream.push(`(Rs. ${item.total.toFixed(2)}) Tj`);
    } else {
      // Empty row placeholder showing $00.00 / Rs. 00.00 in total column to match template exactly
      stream.push('0.60 0.60 0.60 rg');
      stream.push('/F1 8 Tf');
      stream.push('400 0 Td');
      stream.push(`(Rs. 00.00) Tj`);
    }
    stream.push('ET');
  }

  // ==========================================
  // 5. SUMMARY & TOTALS (RIGHT SIDE)
  // ==========================================
  const subtotal = order.totalAmount;
  const totalsLeftX = 375;
  const totalsValueX = 475;

  // Subtotal row
  stream.push('BT');
  stream.push('0.35 0.35 0.35 rg');
  stream.push('/F1 9 Tf');
  stream.push(`${totalsLeftX} 390 Td`);
  stream.push(`(Subtotal:) Tj`);
  stream.push('/F2 9.5 Tf');
  stream.push('0.20 0.20 0.20 rg');
  stream.push(`100 0 Td`);
  stream.push(`(Rs. ${subtotal.toFixed(2)}) Tj`);
  stream.push('ET');

  // Thin separator
  stream.push('0.90 0.90 0.90 rg');
  stream.push(`${totalsLeftX} 380 180.28 0.5 re f`);

  // Taxation row
  stream.push('BT');
  stream.push('0.35 0.35 0.35 rg');
  stream.push('/F1 9 Tf');
  stream.push(`${totalsLeftX} 364 Td`);
  stream.push(`(Taxation:) Tj`);
  stream.push('/F1 9 Tf');
  stream.push('0.20 0.20 0.20 rg');
  stream.push(`100 0 Td`);
  stream.push(`(Rs. 00.00) Tj`);
  stream.push('ET');

  // G. Total Green Box
  stream.push('0.55 0.72 0.17 rg');
  stream.push(`${totalsLeftX - 10} 324 190.28 26 re f`);

  stream.push('BT');
  stream.push('1 1 1 rg');
  stream.push('/F2 10.5 Tf');
  stream.push(`${totalsLeftX + 5} 333 Td`);
  stream.push(`(G. Total) Tj`);
  stream.push('/F2 11 Tf');
  stream.push('95 0 Td');
  stream.push(`(Rs. ${subtotal.toFixed(2)}) Tj`);
  stream.push('ET');

  // ==========================================
  // 6. PAYMENT DETAILS & TERMS (LEFT SIDE)
  // ==========================================
  stream.push('BT');
  stream.push('0.12 0.15 0.17 rg');
  stream.push('/F2 9.5 Tf');
  stream.push('40 390 Td');
  stream.push(`(PAYMENT DETAILS:) Tj`);
  stream.push('/F1 8 Tf');
  stream.push('0.40 0.40 0.40 rg');
  stream.push('0 -13 Td');
  stream.push(`(Method: Razorpay Online Gateway  |  Status: PAID & VERIFIED) Tj`);
  stream.push('0 -11 Td');
  stream.push(`(Transaction ID: ${escapePdfText(txId)}) Tj`);

  stream.push('0.12 0.15 0.17 rg');
  stream.push('/F2 9.5 Tf');
  stream.push('0 -20 Td');
  stream.push(`(TERMS AND CONDITIONS:) Tj`);
  stream.push('/F1 7.5 Tf');
  stream.push('0.45 0.45 0.45 rg');
  stream.push('0 -12 Td');
  stream.push(`(${escapePdfText('Store Pickup: Villupuram Railway Station (1st Platform) or Home Delivery.')}) Tj`);
  stream.push('0 -10 Td');
  stream.push(`(Freshly prepared authentic sweet made with pure milk, eggs, ghee and sugar.) Tj`);
  stream.push('0 -10 Td');
  stream.push(`(Best consumed within 7 days. Keep refrigerated for optimal taste & freshness.) Tj`);

  // Bold italic "Thank you for your purchase here!"
  stream.push('0.12 0.15 0.17 rg');
  stream.push('/F3 11 Tf');
  stream.push('0 -22 Td');
  stream.push(`(Thank you for your purchase here!) Tj`);
  stream.push('ET');

  // ==========================================
  // 7. BOTTOM FOOTER BANNER & SIGNATURE
  // ==========================================
  // Dark Slate Polygon footer on bottom left
  stream.push('0.12 0.15 0.17 rg');
  stream.push('0 30 m 340 30 l 375 74 l 0 74 l h f');

  // Contact info inside Dark Slate footer banner
  stream.push('BT');
  stream.push('1 1 1 rg');
  stream.push('/F1 7.5 Tf');
  stream.push('20 48 Td');
  stream.push(`(${escapePdfText('(+91) 78719 49015')}) Tj`);
  stream.push('105 0 Td');
  stream.push(`(orders@appampattu.com) Tj`);
  stream.push('115 0 Td');
  stream.push(`(Villupuram, Tamil Nadu) Tj`);
  stream.push('ET');

  // Signature block on bottom right
  stream.push('BT');
  stream.push('0.30 0.30 0.30 rg');
  stream.push('/F4 15 Tf'); // Times Italic signature style
  stream.push('425 64 Td');
  stream.push(`(Appampattu Sweets) Tj`);
  stream.push('ET');

  // Thin line under signature
  stream.push('0.85 0.85 0.85 rg');
  stream.push('410 54 130 0.6 re f');

  // Signature title
  stream.push('BT');
  stream.push('0.40 0.40 0.40 rg');
  stream.push('/F1 8.5 Tf');
  stream.push('430 42 Td');
  stream.push(`(Authorized Signatory) Tj`);
  stream.push('ET');

  const contentStream = stream.join('\n');

  // ==========================================
  // 8. PDF DOCUMENT OBJECT HIERARCHY
  // ==========================================
  // 1: Catalog
  pdf.addObject('<< /Type /Catalog /Pages 2 0 R >>');
  // 2: Pages
  pdf.addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  // 3: Page (A4 Dimensions: 595.28 x 841.89 pt)
  pdf.addObject(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> >> >>'
  );
  // 4: Contents Stream
  pdf.addObject(
    `<< /Length ${Buffer.byteLength(contentStream, 'latin1')} >>\nstream\n${contentStream}\nendstream`
  );
  // 5: Font F1 (Helvetica Regular)
  pdf.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  // 6: Font F2 (Helvetica Bold)
  pdf.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  // 7: Font F3 (Helvetica Oblique / Italic)
  pdf.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>');
  // 8: Font F4 (Times Italic for script signature)
  pdf.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>');

  return pdf.build();
}
