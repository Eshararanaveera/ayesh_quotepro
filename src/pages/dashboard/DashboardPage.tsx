import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, ChevronRight, Clock, FileText, Plus, Users } from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { buttonVariants } from '../../components/ui/button-variants';
import { useAppData } from '../../hooks/useAppData';
import { formatCurrency } from '../../utils/formatters';
import { formatDate } from '../../utils/date';
import { statusStyles } from '../../styles/colors';
import { QUOTATION_STATUSES } from '../../types/quotation';
import { cn } from '../../lib/cn';

/** Compact LKR for stat cards: LKR 2.45M, LKR 850K. */
function formatCompactLKR(value: number): string {
  return `LKR ${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)}`;
}

export default function DashboardPage() {
  const { quotations, clients } = useAppData();

  const stats = useMemo(() => {
    const approved = quotations.filter((q) => q.status === 'approved');
    const pending = quotations.filter((q) => q.status === 'pending');
    const active = quotations.filter((q) => q.status === 'draft' || q.status === 'pending');
    return {
      revenue: approved.reduce((sum, q) => sum + q.totals.grandTotal, 0),
      approvedCount: approved.length,
      activeCount: active.length,
      activeValue: active.reduce((sum, q) => sum + q.totals.grandTotal, 0),
      pendingCount: pending.length,
      pendingValue: pending.reduce((sum, q) => sum + q.totals.grandTotal, 0),
    };
  }, [quotations]);

  const recent = useMemo(
    () =>
      [...quotations]
        .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.quoteNumber.localeCompare(a.quoteNumber))
        .slice(0, 5),
    [quotations],
  );

  const pipeline = useMemo(() => {
    const total = quotations.length || 1;
    return QUOTATION_STATUSES.map((status) => {
      const items = quotations.filter((q) => q.status === status);
      return {
        status,
        count: items.length,
        value: items.reduce((sum, q) => sum + q.totals.grandTotal, 0),
        share: (items.length / total) * 100,
      };
    });
  }, [quotations]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Here's an overview of your quotations and clients."
        actions={
          <Link to="/quotations/new" className={buttonVariants()}>
            <Plus size={18} aria-hidden />
            New Quotation
          </Link>
        }
      />

      {/* Summary cards */}
      <section aria-label="Summary" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={<span title={formatCurrency(stats.revenue)}>{formatCompactLKR(stats.revenue)}</span>}
          icon={<Banknote size={20} aria-hidden />}
          gradient="from-brand-600 to-accent-600 shadow-brand-600/25"
          footnote={`From ${stats.approvedCount} approved quotation${stats.approvedCount === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Active Quotations"
          value={stats.activeCount}
          icon={<FileText size={20} aria-hidden />}
          gradient="from-emerald-500 to-teal-500 shadow-emerald-500/25"
          footnote={`Worth ${formatCompactLKR(stats.activeValue)} (drafts + pending)`}
        />
        <StatCard
          label="Pending Approvals"
          value={stats.pendingCount}
          icon={<Clock size={20} aria-hidden />}
          gradient="from-amber-500 to-orange-500 shadow-amber-500/25"
          footnote={`${formatCompactLKR(stats.pendingValue)} awaiting client decision`}
        />
        <StatCard
          label="Total Clients"
          value={clients.length}
          icon={<Users size={20} aria-hidden />}
          gradient="from-sky-500 to-blue-600 shadow-sky-500/25"
          footnote={
            <Link to="/customers" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Manage clients
            </Link>
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-3">
        {/* Recent quotations */}
        <Card flush className="overflow-hidden 2xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-6 py-5 dark:border-zinc-800/70">
            <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Recent Quotations</h2>
            <Link
              to="/quotations"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              View all <ChevronRight size={14} aria-hidden />
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState icon={<FileText size={28} />} title="No quotations yet" description="Create your first quotation to see it here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200/70 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500 dark:border-zinc-800/70 dark:bg-zinc-900/40 dark:text-zinc-400">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium">Quotation No</th>
                    <th scope="col" className="px-6 py-3 font-medium">Client</th>
                    <th scope="col" className="hidden px-6 py-3 font-medium sm:table-cell">Date</th>
                    <th scope="col" className="px-6 py-3 text-right font-medium">Amount</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {recent.map((q) => (
                    <tr key={q.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-zinc-800/30">
                      <td className="whitespace-nowrap px-6 py-3.5 font-medium">
                        <Link to={`/quotations/${q.id}`} className="text-slate-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400">
                          {q.quoteNumber}
                        </Link>
                      </td>
                      <td className="max-w-[14rem] truncate px-6 py-3.5 text-slate-600 dark:text-zinc-300">{q.client.companyName}</td>
                      <td className="hidden whitespace-nowrap px-6 py-3.5 text-slate-500 sm:table-cell dark:text-zinc-400">{formatDate(q.issueDate)}</td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-right font-medium text-slate-900 dark:text-zinc-100">
                        {formatCurrency(q.totals.grandTotal)}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={q.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pipeline by status */}
        <Card>
          <CardHeader title="Quotation Pipeline" description={`${quotations.length} quotations by status`} />
          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800" aria-hidden>
            {pipeline.map((p) => (
              <div key={p.status} className={cn(statusStyles[p.status].bar, 'h-full')} style={{ width: `${p.share}%` }} />
            ))}
          </div>
          <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-1">
            {pipeline.map((p) => (
              <li key={p.status}>
                <Link
                  to={`/quotations?status=${p.status}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-100/70 xl:flex-col xl:items-start xl:gap-1 2xl:flex-row 2xl:items-center 2xl:gap-3 dark:hover:bg-zinc-800/50"
                >
                  <span className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-zinc-300">
                    <span className={cn('h-2.5 w-2.5 rounded-full', statusStyles[p.status].dot)} aria-hidden />
                    {statusStyles[p.status].label}
                    <span className="text-slate-400 dark:text-zinc-500">· {p.count}</span>
                  </span>
                  <span className="text-sm font-medium tabular-nums text-slate-900 dark:text-zinc-100">{formatCompactLKR(p.value)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Call to action */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-accent-600 p-6 md:p-8">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Ready to send your next quotation?</h2>
            <p className="mt-1 text-sm text-brand-100">VAT and SSCL are calculated for you as you add items.</p>
          </div>
          <Link
            to="/quotations/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
          >
            Create Quotation <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
