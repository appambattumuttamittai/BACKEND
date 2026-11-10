/**
 * Pure TypeScript PDF generator for Appambattu Mutta Mittai
 * Generates standards-compliant ISO 32000 / PDF 1.4 documents
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
    .replace(/[^\x20-\x7E]/g, ''); // Ensure standard ASCII/Latin-1 characters
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

export function generateOrderInvoicePDF(order: OrderInvoiceData): Buffer {
  const pdf = new PDFBuilder();

  // Parse items from adminNotes (e.g. "250gm x 1, 500gm x 2") or fallback to product weight
  const itemsText = order.adminNotes?.split('|')[0]?.trim() || (order.product ? `${order.product.weight} x 1` : 'Mutta Mittai Pack');

  const formattedDate = new Date(order.paidAt || order.createdAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const txId = order.transactionId || (order.adminNotes?.includes('Razorpay:') ? order.adminNotes.split('Razorpay:')[1]?.trim() : 'ONLINE_CONFIRMED');

  // Commands stream for A4 page (595.28 x 841.89 pt)
  // (0, 0) is bottom-left, (595, 842) is top-right
  const stream: string[] = [];

  // Top Maroon Banner
  stream.push('0.768 0.184 0.172 rg'); // Brand Maroon (#C42F2C)
  stream.push('0 740 595.28 102 re f');

  // Top Banner Gold Accent Line
  stream.push('0.96 0.71 0.11 rg'); // Brand Gold (#F5B51B)
  stream.push('0 735 595.28 5 re f');

  // Banner Header Text
  stream.push('BT');
  stream.push('1 1 1 rg'); // White text
  stream.push('/F2 20 Tf');
  stream.push('40 802 Td');
  stream.push(`(${escapePdfText('APPAMPATTU MUTTA MITTAI')}) Tj`);
  stream.push('/F1 10 Tf');
  stream.push('0 -16 Td');
  stream.push(`(${escapePdfText('Traditional Authentic Egg Sweet  |  Meenambur, Villupuram, Tamil Nadu')}) Tj`);
  stream.push('/F2 11 Tf');
  stream.push('0 -16 Td');
  stream.push(`(${escapePdfText('OFFICIAL TAX INVOICE & ORDER RECEIPT')}) Tj`);
  stream.push('ET');

  // Invoice / Order Meta Box (Left & Right Column)
  stream.push('0.98 0.96 0.92 rg'); // Light warm background
  stream.push('40 575 515.28 140 re f');
  stream.push('0.85 0.78 0.70 RG 1 w'); // Border
  stream.push('40 575 515.28 140 re S');

  // Meta Box Content
  stream.push('BT');
  stream.push('0.23 0.11 0.06 rg'); // Dark Brown (#3A1C10)
  
  // Left Column: Order details
  stream.push('/F2 11 Tf');
  stream.push('55 690 Td');
  stream.push(`(ORDER DETAILS) Tj`);
  stream.push('/F1 9.5 Tf');
  stream.push('0 -18 Td');
  stream.push(`(Order ID:       #${escapePdfText(order.id.slice(-8).toUpperCase())}) Tj`);
  stream.push('0 -15 Td');
  stream.push(`(Full Ref:        ${escapePdfText(order.id)}) Tj`);
  stream.push('0 -15 Td');
  stream.push(`(Date & Time:  ${escapePdfText(formattedDate)}) Tj`);
  stream.push('0 -15 Td');
  stream.push(`(Txn ID:          ${escapePdfText(txId)}) Tj`);
  stream.push('/F2 9.5 Tf');
  stream.push('0.1 0.5 0.1 rg'); // Green for paid
  stream.push('0 -15 Td');
  stream.push(`(Payment:      PAID / VERIFIED) Tj`);

  // Right Column: Customer details
  stream.push('0.23 0.11 0.06 rg');
  stream.push('/F2 11 Tf');
  stream.push('260 78 Td'); // Move relative to previous point
  stream.push(`(CUSTOMER / DELIVERY DETAILS) Tj`);
  stream.push('/F1 9.5 Tf');
  stream.push('0 -18 Td');
  stream.push(`(Name:     ${escapePdfText(order.customerName)}) Tj`);
  stream.push('0 -15 Td');
  stream.push(`(Phone:    +91 ${escapePdfText(order.phone)}) Tj`);
  stream.push('0 -15 Td');
  stream.push(`(Street:    ${escapePdfText(order.streetAddress || 'Pick-up / Local')}) Tj`);
  stream.push('0 -15 Td');
  stream.push(`(City:       ${escapePdfText(order.city || 'Villupuram')}${order.pincode ? ' - ' + escapePdfText(order.pincode) : ''}) Tj`);
  stream.push('ET');

  // Items Table Header
  stream.push('0.768 0.184 0.172 rg'); // Maroon header
  stream.push('40 525 515.28 26 re f');

  stream.push('BT');
  stream.push('1 1 1 rg');
  stream.push('/F2 10 Tf');
  stream.push('55 533 Td');
  stream.push(`(#) Tj`);
  stream.push('35 0 Td');
  stream.push(`(ITEM DESCRIPTION) Tj`);
  stream.push('260 0 Td');
  stream.push(`(QTY) Tj`);
  stream.push('80 0 Td');
  stream.push(`(AMOUNT) Tj`);
  stream.push('ET');

  // Items Rows
  const items = itemsText.split(',').map((s) => s.trim()).filter(Boolean);
  let currentY = 500;

  stream.push('0.90 0.90 0.90 RG 0.5 w');

  items.forEach((item, idx) => {
    stream.push(`40 ${currentY - 6} 515.28 26 re S`);

    stream.push('BT');
    stream.push('0.2 0.2 0.2 rg');
    stream.push('/F1 9.5 Tf');
    stream.push(`55 ${currentY} Td`);
    stream.push(`(${idx + 1}) Tj`);
    stream.push('35 0 Td');
    stream.push(`(${escapePdfText(item)} - Appampattu Mutta Mittai) Tj`);
    stream.push('270 0 Td');
    stream.push(`(1) Tj`);
    stream.push('70 0 Td');
    stream.push(`(Rs. ${order.totalAmount}) Tj`);
    stream.push('ET');

    currentY -= 28;
  });

  // Grand Total Box
  stream.push('0.96 0.71 0.11 rg'); // Gold fill
  stream.push(`40 ${currentY - 14} 515.28 30 re f`);
  stream.push('0.768 0.184 0.172 RG 1.5 w');
  stream.push(`40 ${currentY - 14} 515.28 30 re S`);

  stream.push('BT');
  stream.push('0.23 0.11 0.06 rg');
  stream.push('/F2 12 Tf');
  stream.push(`330 ${currentY - 5} Td`);
  stream.push(`(TOTAL PAID:) Tj`);
  stream.push('90 0 Td');
  stream.push('/F2 13 Tf');
  stream.push('0.768 0.184 0.172 rg');
  stream.push(`(Rs. ${order.totalAmount}) Tj`);
  stream.push('ET');

  // Notice & Instructions Box
  currentY -= 70;
  stream.push('0.95 0.98 0.95 rg'); // Soft green background
  stream.push(`40 ${currentY} 515.28 45 re f`);
  stream.push('0.2 0.6 0.2 RG 1 w');
  stream.push(`40 ${currentY} 515.28 45 re S`);

  stream.push('BT');
  stream.push('0.1 0.45 0.1 rg');
  stream.push('/F2 10 Tf');
  stream.push(`55 ${currentY + 28} Td`);
  stream.push(`(COLLECTION / DELIVERY INFORMATION:) Tj`);
  stream.push('/F1 8.5 Tf');
  stream.push('0 -14 Td');
  stream.push(`(${escapePdfText('Store Pickup: Villupuram Railway Station (1st Platform) | Home delivery available in Villupuram.')}) Tj`);
  stream.push('ET');

  // Bottom Footer
  stream.push('0.8 0.8 0.8 RG 0.5 w');
  stream.push('40 90 515.28 0.5 re f');

  stream.push('BT');
  stream.push('0.4 0.4 0.4 rg');
  stream.push('/F1 8 Tf');
  stream.push('40 70 Td');
  stream.push(`(APPAMPATTU MUTTA MITTAI  *  Traditional Village Sweets Made With Milk & Egg) Tj`);
  stream.push('0 -12 Td');
  stream.push(`(WhatsApp / Helpline: +91 97893 25010  *  Website: appampattueggsweet.com) Tj`);
  stream.push('0 -12 Td');
  stream.push(`(This is a computer-generated tax invoice and order confirmation. No physical signature required.) Tj`);
  stream.push('ET');

  const contentStream = stream.join('\n');

  // PDF Object Hierarchy
  // 1: Catalog
  pdf.addObject('<< /Type /Catalog /Pages 2 0 R >>');
  // 2: Pages
  pdf.addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  // 3: Page
  pdf.addObject(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>'
  );
  // 4: Contents
  pdf.addObject(`<< /Length ${Buffer.byteLength(contentStream, 'latin1')} >>\nstream\n${contentStream}\nendstream`);
  // 5: Font F1 (Helvetica Regular)
  pdf.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  // 6: Font F2 (Helvetica Bold)
  pdf.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  return pdf.build();
}
