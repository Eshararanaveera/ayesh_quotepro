import type { TaxConfig } from './quotation';

export interface CompanyProfile {
  name: string;
  /** Logo as a data URL (stored locally until a backend exists). */
  logo: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
  /** Taxpayer Identification Number. */
  tin: string;
  /** VAT registration number. */
  vatRegNo: string;
}

export interface QuotationDefaults {
  prefix: string;
  validityDays: number;
  notes: string;
}

export interface AppSettings {
  company: CompanyProfile;
  /** Default taxes for new quotations. Each quotation keeps its own copy. */
  tax: TaxConfig;
  quotation: QuotationDefaults;
}
