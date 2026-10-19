#!/usr/bin/env node
/**
 * End-to-end check of every API operation against your real database.
 *
 *   1. Start the API:      npm run dev
 *   2. In a 2nd terminal:  npm run smoke
 *
 * Options (environment variables):
 *   API_URL         default http://localhost:4000/api
 *   ADMIN_EMAIL     default admin@quotepro.lk
 *   ADMIN_PASSWORD  default Admin@123
 *
 * It creates a test client, quotation and invoice, checks every response,
 * then deletes what it created. It doesn't change your password or settings.
 */

const API = (process.env.API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@quotepro.lk';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@123';

let token = '';
let passed = 0;
let failed = 0;

async function call(method, path, body, { auth = true } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function check(name, condition, info) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
    if (info !== undefined) console.log('     ', typeof info === 'string' ? info : JSON.stringify(info).slice(0, 400));
  }
}

const today = new Date().toISOString().slice(0, 10);

async function main() {
  console.log(`\nQuotePro API smoke test → ${API}\n`);

  // ── Health & auth ──────────────────────────────────────────────
  console.log('Health & sign-in');
  const health = await call('GET', '/health', undefined, { auth: false }).catch((e) => ({ status: 0, data: String(e) }));
  check('API is running and database reachable', health.status === 200, health.data);
  if (health.status !== 200) {
    console.log('\n  Start the API first with `npm run dev`, and check DATABASE_URL in .env.\n');
    process.exit(1);
  }

  const noAuth = await call('GET', '/clients', undefined, { auth: false });
  check('Protected routes need a login (401)', noAuth.status === 401, noAuth);

  const badLogin = await call('POST', '/auth/login', { email: EMAIL, password: 'wrong-password' }, { auth: false });
  check('Wrong password is rejected (401)', badLogin.status === 401, badLogin);

  const login = await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD }, { auth: false });
  check('Sign in returns a token', login.status === 200 && typeof login.data?.token === 'string', login);
  if (login.status !== 200) {
    console.log('\n  Check ADMIN_EMAIL / ADMIN_PASSWORD (did you change the password?). Run `npm run db:seed` if no admin exists.\n');
    process.exit(1);
  }
  token = login.data.token;

  const me = await call('GET', '/auth/me');
  check('GET /auth/me returns the user', me.status === 200 && me.data?.user?.email === EMAIL.toLowerCase(), me);

  // ── Settings ───────────────────────────────────────────────────
  console.log('\nSettings');
  const settings = await call('GET', '/settings');
  check('Read settings', settings.status === 200 && typeof settings.data?.tax?.vatRate === 'number', settings);
  const badSettings = await call('PUT', '/settings', { quotation: { prefix: 'has spaces!' } });
  check('Invalid prefix is rejected (400)', badSettings.status === 400 && badSettings.data?.details?.['quotation.prefix'], badSettings);

  // ── Clients ────────────────────────────────────────────────────
  console.log('\nClients');
  const badClient = await call('POST', '/clients', { companyName: '', contactName: 'X', email: 'not-an-email' });
  check('Validation errors per field (400)', badClient.status === 400 && badClient.data?.details?.email && badClient.data?.details?.companyName, badClient);

  const created = await call('POST', '/clients', {
    companyName: 'Smoke Test Traders (Pvt) Ltd',
    contactName: 'Test Person',
    email: 'Smoke.Test@Example.LK',
    phone: '+94 77 000 0000',
    address: '1 Test Road',
    city: 'Colombo 01',
    taxId: '',
  });
  check('Create client (201)', created.status === 201 && created.data?.id, created);
  const clientId = created.data?.id;
  check('Email stored in lower case', created.data?.email === 'smoke.test@example.lk', created.data);

  const listed = await call('GET', '/clients?search=smoke test');
  check('Search clients', listed.status === 200 && listed.data.some((c) => c.id === clientId), listed);

  const updated = await call('PUT', `/clients/${clientId}`, { ...created.data, city: 'Kandy' });
  check('Update client', updated.status === 200 && updated.data?.city === 'Kandy', updated);

  // ── Quotations ─────────────────────────────────────────────────
  console.log('\nQuotations');
  const quoteBody = {
    status: 'pending',
    clientId,
    issueDate: today,
    validityDays: 14,
    discountType: 'percentage',
    discountValue: 10,
    tax: { vatEnabled: true, vatRate: 18, ssclEnabled: true, ssclRate: 2.5 },
    notes: 'Smoke test quotation',
    items: [
      { description: 'Laptop', quantity: 2, unitPrice: 45000, imageUrl: 'https://example.com/laptop.jpg' },
      { description: 'Design fee', quantity: 1, unitPrice: '15000.50' },
    ],
    // Totals sent by a browser must be ignored:
    totals: { grandTotal: 1 },
  };

  const badQuote = await call('POST', '/quotations', { ...quoteBody, items: [] });
  check('Quotation needs at least one item (400)', badQuote.status === 400 && badQuote.data?.details?.items, badQuote);

  const quote = await call('POST', '/quotations', quoteBody);
  check('Create quotation (201)', quote.status === 201 && /^[A-Z0-9]+-\d{4}-\d{4}$/.test(quote.data?.quoteNumber ?? ''), quote);
  const q = quote.data ?? {};
  // 105,000.50 − 10% = 94,500.45 → SSCL 2,362.51 → VAT 17,435.33 → 114,298.29
  check('Server calculates totals (LKR 114,298.29)', q.totals?.grandTotal === 114298.29, q.totals);
  check('Tax breakdown correct', q.totals?.ssclAmount === 2362.51 && q.totals?.vatAmount === 17435.33, q.totals);
  check('Client details copied onto quotation', q.client?.companyName === 'Smoke Test Traders (Pvt) Ltd', q.client);
  check('Valid-until = issue date + 14 days', q.validUntil > q.issueDate, { issueDate: q.issueDate, validUntil: q.validUntil });
  check('Item photo saved', q.items?.[0]?.imageUrl === 'https://example.com/laptop.jpg', q.items);

  const quote2 = await call('POST', '/quotations', { ...quoteBody, status: 'draft' });
  check('Quotation numbers increase', quote2.status === 201 && quote2.data.quoteNumber > q.quoteNumber, [q.quoteNumber, quote2.data?.quoteNumber]);

  const got = await call('GET', `/quotations/${q.id}`);
  check('Get quotation by id', got.status === 200 && got.data.items.length === 2, got);

  const filtered = await call('GET', '/quotations?status=pending&search=smoke');
  check('Filter quotations by status + search', filtered.status === 200 && filtered.data.some((x) => x.id === q.id), filtered);

  const edited = await call('PUT', `/quotations/${q.id}`, {
    ...quoteBody,
    items: [{ description: 'Laptop', quantity: 1, unitPrice: 100000 }],
    discountValue: 0,
  });
  check('Update quotation recalculates (LKR 120,950.00)', edited.status === 200 && edited.data?.totals?.grandTotal === 120950, edited.data?.totals);
  check('Quote number unchanged after edit', edited.data?.quoteNumber === q.quoteNumber, edited.data?.quoteNumber);

  const notApproved = await call('POST', `/quotations/${q.id}/invoices`, {});
  check('Only approved quotations can be invoiced (409)', notApproved.status === 409, notApproved);

  const approved = await call('PATCH', `/quotations/${q.id}/status`, { status: 'approved' });
  check('Approve quotation', approved.status === 200 && approved.data?.status === 'approved', approved);

  // ── Invoices ───────────────────────────────────────────────────
  console.log('\nInvoices');
  const part = await call('POST', `/quotations/${q.id}/invoices`, { amount: 50000, dueInDays: 7 });
  check('Create part invoice (201)', part.status === 201 && part.data?.amount === 50000 && /^INV-/.test(part.data?.invoiceNumber), part);

  const tooMuch = await call('POST', `/quotations/${q.id}/invoices`, { amount: 999999 });
  check('Cannot invoice more than the balance (400)', tooMuch.status === 400, tooMuch);

  const rest = await call('POST', `/quotations/${q.id}/invoices`, {});
  check('Invoice remaining balance (LKR 70,950.00)', rest.status === 201 && rest.data?.amount === 70950, rest);

  const full = await call('POST', `/quotations/${q.id}/invoices`, {});
  check('Fully invoiced quotation is rejected (409)', full.status === 409, full);

  const lockedEdit = await call('PUT', `/quotations/${q.id}`, quoteBody);
  check('Invoiced quotation cannot be edited (409)', lockedEdit.status === 409, lockedEdit);

  const paid = await call('PATCH', `/invoices/${part.data?.id}/status`, { status: 'paid' });
  check('Mark invoice paid', paid.status === 200 && paid.data?.status === 'paid' && paid.data?.paidAt, paid);

  const invList = await call('GET', '/invoices?search=smoke');
  check('List invoices', invList.status === 200 && invList.data.length >= 2, invList);

  const delPaid = await call('DELETE', `/invoices/${part.data?.id}`);
  check('Paid invoice cannot be deleted (409)', delPaid.status === 409, delPaid);

  const quoteWithInvoices = await call('DELETE', `/quotations/${q.id}`);
  check('Quotation with invoices cannot be deleted (409)', quoteWithInvoices.status === 409, quoteWithInvoices);

  // ── Dashboard ──────────────────────────────────────────────────
  console.log('\nDashboard');
  const dash = await call('GET', '/dashboard/summary');
  check('Dashboard summary', dash.status === 200 && Array.isArray(dash.data?.pipeline) && dash.data.totalClients >= 1, dash);

  // ── Client delete keeps documents ──────────────────────────────
  console.log('\nDeleting & clean-up');
  const delClient = await call('DELETE', `/clients/${clientId}`);
  check('Delete client (204)', delClient.status === 204, delClient);
  const afterDelete = await call('GET', `/quotations/${q.id}`);
  check('Quotation kept its client details', afterDelete.status === 200 && afterDelete.data.clientId === null && afterDelete.data.client.companyName === 'Smoke Test Traders (Pvt) Ltd', afterDelete.data);

  // Clean up test records.
  await call('PATCH', `/invoices/${part.data?.id}/status`, { status: 'unpaid' });
  for (const inv of [part.data, rest.data]) if (inv?.id) await call('DELETE', `/invoices/${inv.id}`);
  const delQuote = await call('DELETE', `/quotations/${q.id}`);
  check('Delete quotation after its invoices are removed (204)', delQuote.status === 204, delQuote);
  if (quote2.data?.id) await call('DELETE', `/quotations/${quote2.data.id}`);

  const missing = await call('GET', `/quotations/${q.id}`);
  check('Deleted quotation returns 404', missing.status === 404, missing);

  console.log(`\n${failed === 0 ? '🎉' : '⚠️ '} ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nSmoke test crashed:', err);
  process.exit(1);
});
