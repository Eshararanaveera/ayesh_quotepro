import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlert, CircleCheck, Clock, Filter, Receipt, Search } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { InputField } from '../../components/ui/InputField';
import { SelectField } from '../../components/ui/SelectField';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAppData } from '../../hooks/useAppData';
import { formatCurrency } from '../../utils/formatters';
import { formatDate, daysBetween, todayISO } from '../../utils/date';
import { statusStyles } from '../../styles/colors';
import { INVOICE_STATUSES, type InvoiceStatus } from '../../types/invoice';

export default function InvoicesPage() {
  const { invoices, quotations } = useAppData();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all');

  const totals = useMemo(() => {
    const sum = (s: InvoiceStatus) => invoices.filter((i) => i.status === s).reduce((t, i) => t + i.amount, 0);
    return { paid: sum('paid'), unpaid: sum('unpaid'), overdue: sum('overdue') };
  }, [invoices]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices
      .filter((inv) => status === 'all' || inv.status === status)
      .filter((inv) => !term || inv.invoiceNumber.toLowerCase().includes(term) || inv.clientName.toLowerCase().includes(term))
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }, [invoices, search, status]);

  const today = todayISO();

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Track payments for your approved quotations." />

      <section aria-label="Invoice totals" className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Paid" value={formatCurrency(totals.paid)} icon={<CircleCheck size={20} aria-hidden />} gradient="from-emerald-500 to-teal-500 shadow-emerald-500/25" />
        <StatCard label="Unpaid" value={formatCurrency(totals.unpaid)} icon={<Clock size={20} aria-hidden />} gradient="from-sky-500 to-blue-600 shadow-sky-500/25" />
        <StatCard label="Overdue" value={formatCurrency(totals.overdue)} icon={<CircleAlert size={20} aria-hidden />} gradient="from-rose-500 to-pink-500 shadow-rose-500/25" />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <InputField
          aria-label="Search invoices"
          type="search"
          icon={<Search size={16} />}
          placeholder="Search by invoice no or client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="sm:max-w-md"
        />
        <SelectField
          aria-label="Filter by status"
          icon={<Filter size={16} />}
          value={status}
          onChange={(v) => setStatus(v as InvoiceStatus | 'all')}
          containerClassName="sm:w-48"
          options={[
            { value: 'all', label: 'All statuses' },
            ...INVOICE_STATUSES.map((s) => ({ value: s, label: statusStyles[s].label, dot: statusStyles[s].dot })),
          ]}
        />
      </div>

      <Card flush className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={<Receipt size={28} />} title="No invoices found" description="Try a different search or status." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-slate-200/70 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500 dark:border-zinc-800/70 dark:bg-zinc-900/40 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-6 py-3.5 font-medium">Invoice No</th>
                  <th scope="col" className="px-6 py-3.5 font-medium">Quotation</th>
                  <th scope="col" className="px-6 py-3.5 font-medium">Client</th>
                  <th scope="col" className="px-6 py-3.5 text-right font-medium">Amount (LKR)</th>
                  <th scope="col" className="px-6 py-3.5 font-medium">Due date</th>
                  <th scope="col" className="px-6 py-3.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {filtered.map((inv) => {
                  const quote = quotations.find((q) => q.id === inv.quotationId);
                  const daysLate = inv.status === 'overdue' ? daysBetween(inv.dueDate, today) : 0;
                  return (
                    <tr key={inv.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-zinc-800/30">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-zinc-100">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4">
                        {quote ? (
                          <Link to={`/quotations/${quote.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                            {quote.quoteNumber}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="max-w-[16rem] truncate px-6 py-4 text-slate-700 dark:text-zinc-300">{inv.clientName}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-zinc-100">{formatCurrency(inv.amount, { symbol: '' })}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">
                        {formatDate(inv.dueDate)}
                        {daysLate > 0 && <span className="ml-2 text-xs text-rose-600 dark:text-rose-400">{daysLate} days late</span>}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
