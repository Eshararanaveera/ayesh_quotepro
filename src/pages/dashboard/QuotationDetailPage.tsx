import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, FilePenLine, FileText, Mail, Pencil, Printer, Send, Trash2, CircleX } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { buttonVariants } from '../../components/ui/button-variants';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { amountToWords, formatCurrency, formatNumber } from '../../utils/formatters';
import { lineTotal } from '../../utils/calculations';
import { ItemThumbnail } from '../../features/quotations/ItemImage';
import { formatDate } from '../../utils/date';
import type { QuotationStatus } from '../../types/quotation';

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { quotations, setQuotationStatus, deleteQuotation } = useAppData();
  const { settings } = useSettings();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const quote = quotations.find((q) => q.id === id);
  const company = settings.company;

  // "Download PDF" from the list opens this page with ?print=1 and starts the print dialog.
  const shouldPrint = searchParams.get('print') === '1';
  useEffect(() => {
    if (!shouldPrint || !quote) return;
    setSearchParams({}, { replace: true });
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [shouldPrint, quote, setSearchParams]);

  if (!quote) {
    return (
      <Card>
        <EmptyState
          icon={<FileText size={28} />}
          title="Quotation not found"
          description="It may have been deleted, or the link is wrong."
          action={<Link to="/quotations" className={buttonVariants({ variant: 'outline' })}>Back to quotations</Link>}
        />
      </Card>
    );
  }

  const { totals, tax } = quote;
  const changeStatus = (status: QuotationStatus) => setQuotationStatus(quote.id, status);

  const mailto =
    `mailto:${encodeURIComponent(quote.client.email)}` +
    `?subject=${encodeURIComponent(`Quotation ${quote.quoteNumber} from ${company.name}`)}` +
    `&body=${encodeURIComponent(
      `Dear ${quote.client.contactName},\n\nPlease find our quotation ${quote.quoteNumber} for ${formatCurrency(totals.grandTotal)}, valid until ${formatDate(quote.validUntil)}.\n\nThank you,\n${company.name}`,
    )}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none print:space-y-0">
      {/* Action bar (not printed) */}
      <div className="glass flex flex-col gap-4 rounded-2xl p-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link to="/quotations" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800" aria-label="Back to quotations">
            <ArrowLeft size={18} />
          </Link>
          <span className="font-semibold text-slate-900 dark:text-zinc-100">{quote.quoteNumber}</span>
          <StatusBadge status={quote.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quote.status === 'draft' && (
            <Button size="sm" variant="outline" leftIcon={<Send size={15} />} onClick={() => changeStatus('pending')}>
              Submit for approval
            </Button>
          )}
          {quote.status === 'pending' && (
            <>
              <Button size="sm" variant="outline" leftIcon={<CircleCheck size={15} className="text-emerald-500" />} onClick={() => changeStatus('approved')}>
                Mark approved
              </Button>
              <Button size="sm" variant="outline" leftIcon={<CircleX size={15} className="text-rose-500" />} onClick={() => changeStatus('rejected')}>
                Mark rejected
              </Button>
            </>
          )}
          <Link to={`/quotations/${quote.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Pencil size={15} aria-hidden /> Edit
          </Link>
          <Button size="sm" variant="outline" leftIcon={<Printer size={15} />} onClick={() => window.print()}>
            Print / PDF
          </Button>
          <a href={mailto} className={buttonVariants({ size: 'sm' })}>
            <Mail size={15} aria-hidden /> Email
          </a>
          <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete quotation" title="Delete" className="hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10">
            <Trash2 size={17} />
          </Button>
        </div>
      </div>

      {/* A4 document — always light, like paper */}
      <article className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 text-slate-800 shadow-glass-lg sm:p-10 md:p-12 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
          <div className="space-y-3">
            {company.logo ? (
              <img src={company.logo} alt={`${company.name} logo`} className="h-14 max-w-[200px] object-contain" />
            ) : (
              <div className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-900">
                <span className="rounded-xl bg-brand-600 p-2.5 print:border print:border-slate-900 print:bg-transparent">
                  <FilePenLine className="h-6 w-6 text-white print:text-slate-900" aria-hidden />
                </span>
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-slate-900">{company.name}</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-500">{company.address}</p>
              <p className="text-sm text-slate-500">{[company.phone, company.email].filter(Boolean).join(' · ')}</p>
              {(company.tin || company.vatRegNo) && (
                <p className="mt-1 text-xs text-slate-500">
                  {company.tin && <>TIN: {company.tin}</>}
                  {company.tin && company.vatRegNo && ' · '}
                  {company.vatRegNo && <>VAT Reg. No: {company.vatRegNo}</>}
                </p>
              )}
            </div>
          </div>

          <div className="sm:text-right">
            <h1 className="mb-4 text-3xl font-light uppercase tracking-[0.2em] text-slate-300 print:text-slate-900">Quotation</h1>
            <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-sm sm:justify-end">
              <dt className="font-semibold text-slate-900">Quotation No</dt>
              <dd className="font-medium text-slate-900">{quote.quoteNumber}</dd>
              <dt className="text-slate-500">Issue date</dt>
              <dd>{formatDate(quote.issueDate)}</dd>
              <dt className="text-slate-500">Valid until</dt>
              <dd>{formatDate(quote.validUntil)}</dd>
            </dl>
          </div>
        </header>

        <section className="mt-10 border-l-4 border-brand-500 pl-4 print:border-slate-900">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Quotation for</h2>
          <p className="text-lg font-bold text-slate-900">{quote.client.companyName}</p>
          <div className="mt-1 text-sm leading-relaxed text-slate-600">
            <p>Attn: {quote.client.contactName}</p>
            {quote.client.address && <p>{quote.client.address}</p>}
            {quote.client.city && <p>{quote.client.city}</p>}
            <p>{[quote.client.phone, quote.client.email].filter(Boolean).join(' · ')}</p>
            {quote.client.taxId && <p className="text-xs text-slate-500">TIN / VAT: {quote.client.taxId}</p>}
          </div>
        </section>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-800 text-slate-800">
                <th scope="col" className="w-10 py-3 text-center font-bold">#</th>
                <th scope="col" className="py-3 font-bold">Description</th>
                <th scope="col" className="w-20 py-3 text-center font-bold">Qty</th>
                <th scope="col" className="w-36 py-3 text-right font-bold">Unit price (LKR)</th>
                <th scope="col" className="w-36 py-3 text-right font-bold">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quote.items.map((item, i) => (
                <tr key={item.id}>
                  <td className="py-3.5 text-center text-slate-400">{i + 1}</td>
                  <td className="py-3.5 pr-4 font-medium text-slate-900">
                    <div className="flex items-center gap-3">
                      <ItemThumbnail url={item.imageUrl} alt={item.description} eager className="h-12 w-12 print:h-11 print:w-11" />
                      <span>{item.description}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-center text-slate-700">{formatNumber(item.quantity)}</td>
                  <td className="py-3.5 text-right text-slate-700">{formatCurrency(item.unitPrice, { symbol: '' })}</td>
                  <td className="py-3.5 text-right font-medium text-slate-900">{formatCurrency(lineTotal(item), { symbol: '' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-sm space-y-2.5 text-sm">
            <TotalRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
            {totals.discountAmount > 0 && (
              <TotalRow
                label={quote.discountType === 'percentage' ? `Discount (${quote.discountValue}%)` : 'Discount'}
                value={`− ${formatCurrency(totals.discountAmount)}`}
              />
            )}
            {totals.discountAmount > 0 && <TotalRow label="Net amount" value={formatCurrency(totals.netAmount)} />}
            {tax.ssclEnabled && <TotalRow label={`SSCL (${tax.ssclRate}%)`} value={formatCurrency(totals.ssclAmount)} />}
            {tax.vatEnabled && <TotalRow label={`VAT (${tax.vatRate}%)`} value={formatCurrency(totals.vatAmount)} />}
            <div className="flex items-end justify-between gap-4 border-t-2 border-slate-800 pt-3">
              <dt className="text-base font-bold uppercase tracking-wide text-slate-900">Grand total</dt>
              <dd className="text-2xl font-bold tabular-nums text-brand-700 print:text-slate-900">{formatCurrency(totals.grandTotal)}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 print:bg-transparent print:px-0">
          <span className="font-semibold">Amount in words: </span>
          {amountToWords(totals.grandTotal)}
        </p>

        <footer className="mt-12 grid grid-cols-1 gap-10 border-t border-slate-200 pt-8 text-sm sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-800">Terms & Conditions</h3>
            <p className="whitespace-pre-line text-xs leading-relaxed text-slate-500">{quote.notes || '—'}</p>
          </div>
          <div className="flex flex-col items-start gap-8 sm:items-end">
            <div className="mt-10 w-48 border-b-2 border-slate-800" />
            <div className="sm:text-right">
              <p className="font-bold text-slate-800">Authorised Signature</p>
              <p className="mt-1 text-xs text-slate-500">For {company.name}</p>
            </div>
          </div>
        </footer>
      </article>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete quotation?"
        message={`${quote.quoteNumber} for ${quote.client.companyName} will be permanently deleted.`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteQuotation(quote.id);
          navigate('/quotations', { replace: true });
        }}
      />
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2.5 text-slate-600">
      <dt>{label}</dt>
      <dd className="tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}
