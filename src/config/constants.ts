import type { AppSettings } from '../types/settings';

/** localStorage keys. `theme` must match the inline script in index.html. */
export const STORAGE_KEYS = {
  theme: 'quotepro:theme',
  settings: 'quotepro:settings',
  data: 'quotepro:data:v1',
  sidebarCollapsed: 'quotepro:sidebar-collapsed',
  credentials: 'quotepro:admin-credentials',
  session: 'quotepro:session',
} as const;

/**
 * First-run admin login. You'll be asked to change the password after signing in
 * (Settings → Security). Replace with real accounts once a backend exists.
 */
export const DEFAULT_ADMIN = {
  email: 'admin@quotepro.lk',
  name: 'Admin',
  password: 'Admin@123',
} as const;

/** Sri Lankan tax rates in percent. Update here if the law changes. */
export const TAX_RATES = {
  vat: 18,
  sscl: 2.5,
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    name: 'QuotePro (Pvt) Ltd',
    logo: null,
    address: 'No. 42, Galle Road\nColombo 03',
    phone: '+94 11 234 5678',
    email: 'hello@quotepro.lk',
    website: 'https://quotepro.lk',
    tin: '',
    vatRegNo: '',
  },
  tax: {
    vatEnabled: true,
    vatRate: TAX_RATES.vat,
    ssclEnabled: true,
    ssclRate: TAX_RATES.sscl,
  },
  quotation: {
    prefix: 'QT',
    validityDays: 14,
    notes:
      '1. All prices are in Sri Lankan Rupees (LKR).\n' +
      '2. 50% advance payment is required to confirm the order.\n' +
      '3. This quotation is valid until the date stated above.',
  },
};
