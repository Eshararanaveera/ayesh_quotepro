/**
 * Seeds the database:  npm run db:seed
 *  • the first admin user (from SEED_ADMIN_* in .env)
 *  • the settings row with Sri Lankan defaults
 *  • optional sample clients, quotations and invoices (SEED_SAMPLE_DATA=true)
 *
 * Safe to run more than once: existing data is not duplicated.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type QuotationStatus } from '@prisma/client';
import { calculateTotals, lineTotal } from '../src/lib/calculations.js';
import { addDays, toDbDate, todayISO } from '../src/lib/dates.js';
import { nextDocumentNumber } from '../src/lib/numbering.js';

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? 'admin@quotepro.lk').toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'Admin';
const WITH_SAMPLES = (process.env.SEED_SAMPLE_DATA ?? 'true') === 'true';
const TODAY = todayISO(process.env.APP_TIMEZONE ?? 'Asia/Colombo');

const DEFAULT_NOTES =
  '1. All prices are in Sri Lankan Rupees (LKR).\n' +
  '2. 50% advance payment is required to confirm the order.\n' +
  '3. This quotation is valid until the date stated above.';

// Fictional sample clients.
const CLIENTS = [
  { companyName: 'Serendib Logistics (Pvt) Ltd', contactName: 'Nimal Perera', email: 'nimal@serendiblogistics.lk', phone: '+94 77 123 4567', address: 'No. 18, Baseline Road', city: 'Colombo 09', taxId: '114567890-7000' },
  { companyName: 'Kandy Hills Hotels', contactName: 'Dilani Fernando', email: 'dilani@kandyhills.lk', phone: '+94 81 222 3344', address: '25 Peradeniya Road', city: 'Kandy', taxId: null },
  { companyName: 'Ruhuna Agro Exports', contactName: 'Kasun Jayasinghe', email: 'kasun@ruhunaagro.lk', phone: '+94 71 456 7890', address: '112 Matara Road', city: 'Galle', taxId: '409876543-7000' },
  { companyName: 'Lotus Tech Solutions', contactName: 'Tharushi Wickramasinghe', email: 'tharushi@lotustech.lk', phone: '+94 76 111 2222', address: 'Level 5, 77 Union Place', city: 'Colombo 02', taxId: '123450987-7000' },
  { companyName: 'Jaffna Builders & Engineers', contactName: 'Arjun Sivakumar', email: 'arjun@jaffnabuilders.lk', phone: '+94 21 333 4444', address: '9 Hospital Road', city: 'Jaffna', taxId: null },
  { companyName: 'Negombo Seafoods', contactName: 'Ruwan Silva', email: 'ruwan@negomboseafoods.lk', phone: '+94 31 222 7788', address: '41 Lewis Place', city: 'Negombo', taxId: null },
];

// [client index, status, days ago, discount %, items]
const QUOTES: [number, QuotationStatus, number, number, [string, number, number][]][] = [
  [3, 'approved', 45, 5, [['Annual cloud hosting — high-availability cluster', 1, 450000], ['Security audit & compliance report', 1, 250000], ['Tier 3 support (monthly)', 12, 12500]]],
  [1, 'approved', 38, 0, [['Hotel booking website redesign', 1, 385000], ['Online payment gateway integration', 1, 95000]]],
  [0, 'expired', 36, 0, [['Fleet tracking devices', 25, 18500], ['Installation per vehicle', 25, 3500]]],
  [2, 'rejected', 30, 10, [['Export documentation system', 1, 620000]]],
  [4, 'pending', 6, 0, [['Site office network cabling', 1, 175000], ['Wi-Fi access points', 6, 32500], ['CCTV cameras (4MP)', 12, 21000]]],
  [5, 'pending', 3, 0, [['Cold-room temperature monitoring kit', 4, 68000], ['Monitoring subscription (annual)', 1, 54000]]],
  [1, 'draft', 2, 0, [['Staff POS training (per day)', 3, 45000]]],
  [3, 'draft', 1, 2.5, [['Mobile app — phase 2 development', 1, 1250000], ['UI/UX design sprint', 2, 150000]]],
];

async function main() {
  // 1. Admin user
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`• Admin ${ADMIN_EMAIL} already exists — password left unchanged`);
  } else {
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: 'admin',
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
        mustChangePassword: true,
      },
    });
    console.log(`✓ Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}  (change it after signing in)`);
  }
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });

  // 2. Settings
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: 'QuotePro (Pvt) Ltd',
      companyAddress: 'No. 42, Galle Road\nColombo 03',
      companyPhone: '+94 11 234 5678',
      companyEmail: 'hello@quotepro.lk',
      companyWebsite: 'https://quotepro.lk',
      quoteNotes: DEFAULT_NOTES,
    },
  });
  console.log('✓ Settings ready');

  // 3. Sample data
  if (!WITH_SAMPLES) return;
  if ((await prisma.quotation.count()) > 0) {
    console.log('• Quotations already exist — sample data skipped');
    return;
  }

  const clients = [];
  for (const c of CLIENTS) {
    clients.push(await prisma.client.create({ data: c }));
  }
  console.log(`✓ ${clients.length} sample clients`);

  const tax = { vatEnabled: true, vatRate: 18, ssclEnabled: true, ssclRate: 2.5 };
  // Oldest first, so numbers follow the dates.
  for (const [clientIndex, status, daysAgo, discount, items] of QUOTES) {
    const client = clients[clientIndex];
    const issueDate = addDays(TODAY, -daysAgo);
    const lines = items.map(([description, quantity, unitPrice]) => ({ description, quantity, unitPrice }));
    const totals = calculateTotals(lines, { type: 'percentage', value: discount }, tax);

    await prisma.$transaction(async (tx) => {
      const quoteNumber = await nextDocumentNumber(tx, 'QT', Number(issueDate.slice(0, 4)));
      const quotation = await tx.quotation.create({
        data: {
          quoteNumber,
          status,
          clientId: client.id,
          clientCompanyName: client.companyName,
          clientContactName: client.contactName,
          clientEmail: client.email,
          clientPhone: client.phone,
          clientAddress: client.address,
          clientCity: client.city,
          clientTaxId: client.taxId,
          issueDate: toDbDate(issueDate),
          validUntil: toDbDate(addDays(issueDate, 14)),
          validityDays: 14,
          discountType: 'percentage',
          discountValue: discount,
          ...tax,
          ...totals,
          notes: DEFAULT_NOTES,
          createdById: admin.id,
          items: {
            create: lines.map((l, position) => ({ ...l, position, lineTotal: lineTotal(l.quantity, l.unitPrice) })),
          },
        },
      });

      // Approved quotations get an invoice: the first one paid, the second overdue.
      if (status === 'approved') {
        const invoiceNumber = await nextDocumentNumber(tx, 'INV', Number(issueDate.slice(0, 4)));
        const paid = clientIndex === 3;
        const invoiceDate = addDays(issueDate, 3);
        await tx.invoice.create({
          data: {
            invoiceNumber,
            quotationId: quotation.id,
            clientId: client.id,
            clientName: client.companyName,
            amount: totals.grandTotal,
            status: paid ? 'paid' : 'unpaid',
            paidAt: paid ? new Date() : null,
            issueDate: toDbDate(invoiceDate),
            dueDate: toDbDate(addDays(invoiceDate, 14)),
          },
        });
      }
    });
  }
  console.log(`✓ ${QUOTES.length} sample quotations and 2 invoices`);
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
