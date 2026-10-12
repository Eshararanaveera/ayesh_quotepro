import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Eye, FileText, Filter, Pencil, Plus, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { InputField } from '../../components/ui/InputField';
import { SelectField } from '../../components/ui/SelectField';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { buttonVariants } from '../../components/ui/button-variants';
import { useAppData } from '../../hooks/useAppData';
import { formatCurrency } from '../../utils/formatters';
import { formatDate } from '../../utils/date';
import { statusStyles } from '../../styles/colors';
import { QUOTATION_STATUSES, type Quotation, type QuotationStatus } from '../../types/quotation';
import { cn } from '../../lib/cn';

const PAGE_SIZE = 10;

type SortKey = 'quoteNumber' | 'client' | 'issueDate' | 'amount';
type SortDir = 'asc' | 'desc';

const sortValue: Record<SortKey, (q: Quotation) => string | number> = {
  quoteNumber: (q) => q.quoteNumber,
  client: (q) => q.client.companyName.toLowerCase(),
  issueDate: (q) => q.issueDate,
  amount: (q) => q.totals.grandTotal,
};

function isStatus(value: string | null): value is QuotationStatus {
  return !!value && (QUOTATION_STATUSES as readonly string[]).includes(value);
}

function SortHeader({
  label,
  column,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  column: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-6 py-3.5 font-medium', align === 'right' && 'text-right')}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'inline-flex items-center gap-1.5 uppercase tracking-wide transition hover:text-slate-800 dark:hover:text-zinc-200',
          active && 'text-slate-800 dark:text-zinc-200',
        )}
      >
        {label}
        <Icon size={13} aria-hidden className={active ? 'opacity-100' : 'opacity-40'} />
      </button>
    </th>
  );
}

export default function QuotationsPage() {
  const { quotations } = useAppData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get('status');
  const statusFilter: QuotationStatus | 'all' = isStatus(statusParam) ? statusParam : 'all';

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'issueDate', dir: 'desc' });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = quotations.filter((q) => {
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      const matchesSearch =
        !term ||
        q.quoteNumber.toLowerCase().includes(term) ||
        q.client.companyName.toLowerCase().includes(term) ||
        q.client.contactName.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
    const get = sortValue[sort.key];
    return list.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [quotations, search, statusFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const firstShown = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const handleSort = (key: SortKey) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'client' || key === 'quoteNumber' ? 'asc' : 'desc' }));
    setPage(1);
  };

  const setStatusFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('status');
    else next.set('status', value);
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const actionClass =
    'rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="Create, track and manage the quotations you send to clients."
        actions={
          <Link to="/quotations/new" className={buttonVariants()}>
            <Plus size={18} aria-hidden />
            Create New Quotation
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <InputField
          aria-label="Search quotations"
          type="search"
          icon={<Search size={16} />}
          placeholder="Search by quotation no or client…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          containerClassName="sm:max-w-md"
          className="glass"
        />
        <SelectField
          aria-label="Filter by status"
          icon={<Filter size={16} />}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          containerClassName="sm:w-52"
          className="glass"
        >
          <option value="all">All statuses</option>
          {QUOTATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusStyles[s].label}
            </option>
          ))}
        </SelectField>
      </div>

      <Card flush className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={28} />}
            title={quotations.length === 0 ? 'No quotations yet' : 'No quotations match your filters'}
            description={quotations.length === 0 ? 'Create your first quotation to get started.' : 'Try a different search term or status.'}
            action={
              quotations.length === 0 ? (
                <Link to="/quotations/new" className={buttonVariants()}>
                  <Plus size={18} aria-hidden /> Create Quotation
                </Link>
              ) : (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="border-b border-slate-200/70 bg-slate-50/60 text-xs text-slate-500 dark:border-zinc-800/70 dark:bg-zinc-900/40 dark:text-zinc-400">
                  <tr>
                    <SortHeader label="Quotation No" column="quoteNumber" sort={sort} onSort={handleSort} />
                    <SortHeader label="Client" column="client" sort={sort} onSort={handleSort} />
                    <SortHeader label="Date" column="issueDate" sort={sort} onSort={handleSort} />
                    <SortHeader label="Amount (LKR)" column="amount" sort={sort} onSort={handleSort} align="right" />
                    <th scope="col" className="px-6 py-3.5 font-medium uppercase tracking-wide">Status</th>
                    <th scope="col" className="px-6 py-3.5 text-right font-medium uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {pageItems.map((q) => (
                    <tr key={q.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-zinc-800/30">
                      <td className="px-6 py-4 font-medium">
                        <Link to={`/quotations/${q.id}`} className="text-slate-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400">
                          {q.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[16rem] truncate font-medium text-slate-700 dark:text-zinc-200">{q.client.companyName}</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">{q.client.contactName}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">{formatDate(q.issueDate)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-zinc-100">
                        {formatCurrency(q.totals.grandTotal, { symbol: '' })}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/quotations/${q.id}`} className={actionClass} title="View" aria-label={`View ${q.quoteNumber}`}>
                            <Eye size={17} />
                          </Link>
                          <Link to={`/quotations/${q.id}/edit`} className={actionClass} title="Edit" aria-label={`Edit ${q.quoteNumber}`}>
                            <Pencil size={17} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => navigate(`/quotations/${q.id}?print=1`)}
                            className={actionClass}
                            title="Download PDF"
                            aria-label={`Download ${q.quoteNumber} as PDF`}
                          >
                            <Download size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/70 bg-slate-50/40 px-6 py-4 sm:flex-row dark:border-zinc-800/70 dark:bg-zinc-900/30">
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Showing <span className="font-medium text-slate-900 dark:text-white">{firstShown}</span>–
                <span className="font-medium text-slate-900 dark:text-white">{lastShown}</span> of{' '}
                <span className="font-medium text-slate-900 dark:text-white">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page">
                  <ChevronLeft size={18} />
                </Button>
                <span className="min-w-[4.5rem] text-center text-sm text-slate-600 dark:text-zinc-300">
                  Page {currentPage} / {pageCount}
                </span>
                <Button variant="outline" size="icon" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Next page">
                  <ChevronRight size={18} />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
