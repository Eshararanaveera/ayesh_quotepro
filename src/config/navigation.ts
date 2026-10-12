import { FileText, LayoutDashboard, Receipt, Settings, Users, type LucideIcon } from 'lucide-react';

export interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Which live count to show as a badge. */
  badge?: 'pendingQuotations' | 'clients' | 'unpaidInvoices';
}

export const MAIN_NAV: NavEntry[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/quotations', label: 'Quotations', icon: FileText, badge: 'pendingQuotations' },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/invoices', label: 'Invoices', icon: Receipt, badge: 'unpaidInvoices' },
];

export const SECONDARY_NAV: NavEntry[] = [{ to: '/settings', label: 'Settings', icon: Settings }];

/** Breadcrumb labels for each route segment. */
export const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  quotations: 'Quotations',
  new: 'Create',
  edit: 'Edit',
  customers: 'Customers',
  invoices: 'Invoices',
  settings: 'Settings',
};
