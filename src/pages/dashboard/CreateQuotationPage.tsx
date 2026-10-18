import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Calculator, Calendar, FileText, Mail, MapPin, Package, Phone, Plus, Save, Send, Trash2, UserPlus, Users,
} from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { SelectField } from '../../components/ui/SelectField';
import { DatePicker } from '../../components/ui/DatePicker';
import { TextAreaField } from '../../components/ui/TextAreaField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { buttonVariants } from '../../components/ui/button-variants';
import { ClientFormModal } from '../../features/customers/ClientFormModal';
import { ItemImagePicker } from '../../features/quotations/ItemImage';
import { useAppData } from '../../hooks/useAppData';
import { useSettings } from '../../hooks/useSettings';
import { useQuotationCalculations } from '../../hooks/useQuotationCalculations';
import { amountToWords, formatCurrency, toNumber } from '../../utils/formatters';
import { addDays, formatDate, todayISO } from '../../utils/date';
import { createId } from '../../lib/id';
import { lineTotal } from '../../utils/calculations';
import { cn } from '../../lib/cn';
import type { ClientInput, DiscountType, Quotation, QuotationStatus, TaxConfig } from '../../types/quotation';

/** Form rows keep numbers as strings so typing "0." or clearing a field works naturally. */
interface ItemRow {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  imageUrl: string;
}

interface FormState {
  clientId: string;
  issueDate: string;
  validityDays: string;
  items: ItemRow[];
  discountType: DiscountType;
  discountValue: string;
  tax: TaxConfig;
  notes: string;
}

interface FormErrors {
  clientId?: string;
  issueDate?: string;
  validityDays?: string;
  items?: string;
  rows?: Record<string, { description?: string; quantity?: string; unitPrice?: string }>;
  discount?: string;
}

const newRow = (): ItemRow => ({ id: createId(), description: '', quantity: '1', unitPrice: '', imageUrl: '' });

function fromQuotation(q: Quotation): FormState {
  return {
    clientId: q.clientId,
    issueDate: q.issueDate,
    validityDays: String(q.validityDays),
    items: q.items.map((i) => ({ id: i.id, description: i.description, quantity: String(i.quantity), unitPrice: String(i.unitPrice), imageUrl: i.imageUrl ?? '' })),
    discountType: q.discountType,
    discountValue: q.discountValue ? String(q.discountValue) : '',
    tax: { ...q.tax },
    notes: q.notes,
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const subtotal = form.items.reduce((sum, item) => sum + lineTotal(item), 0);
  if (!form.clientId) errors.clientId = 'Select a client or add a new one';
  if (!form.issueDate) errors.issueDate = 'Issue date is required';
  const days = toNumber(form.validityDays);
  if (!Number.isInteger(days) || days < 1 || days > 365) errors.validityDays = 'Enter 1–365 days';

  const rows: NonNullable<FormErrors['rows']> = {};
  form.items.forEach((item) => {
    const e: { description?: string; quantity?: string; unitPrice?: string } = {};
    if (!item.description.trim()) e.description = 'Description is required';
    if (!(toNumber(item.quantity) > 0)) e.quantity = 'Must be more than 0';
    if (toNumber(item.unitPrice) < 0 || item.unitPrice.trim() === '') e.unitPrice = 'Enter a price';
    if (Object.keys(e).length) rows[item.id] = e;
  });
  if (Object.keys(rows).length) errors.rows = rows;
  if (form.items.length === 0) errors.items = 'Add at least one item';

  const discount = toNumber(form.discountValue);
  if (discount < 0) errors.discount = 'Discount cannot be negative';
  else if (form.discountType === 'percentage' && discount > 100) errors.discount = 'Maximum is 100%';
  else if (form.discountType === 'fixed' && discount > subtotal) errors.discount = 'Discount is more than the subtotal';
  return errors;
}

const hasErrors = (e: FormErrors) => Object.keys(e).length > 0;

export default function CreateQuotationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clients, quotations, addClient, createQuotation, updateQuotation } = useAppData();
  const { settings } = useSettings();

  const existing = id ? quotations.find((q) => q.id === id) : undefined;
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(() =>
    existing
      ? fromQuotation(existing)
      : {
          // "New quotation" from a client card preselects that client.
          clientId: clients.some((c) => c.id === searchParams.get('client')) ? (searchParams.get('client') as string) : '',
          issueDate: todayISO(),
          validityDays: String(settings.quotation.validityDays),
          items: [newRow()],
          discountType: 'percentage',
          discountValue: '',
          tax: { ...settings.tax },
          notes: settings.quotation.notes,
        },
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  const totals = useQuotationCalculations(form.items, form.discountValue, form.tax, form.discountType);
  const validUntil = useMemo(() => {
    const days = toNumber(form.validityDays);
    return form.issueDate && days > 0 ? addDays(form.issueDate, Math.round(days)) : '';
  }, [form.issueDate, form.validityDays]);

  const selectedClient = clients.find((c) => c.id === form.clientId);

  // Re-validate live once the user has tried to save.
  const update = (patch: Partial<FormState>) => {
    const next = { ...form, ...patch };
    setForm(next);
    if (submitted) setErrors(validate(next));
  };

  const updateItem = (rowId: string, field: keyof Omit<ItemRow, 'id'>, value: string) => {
    update({ items: form.items.map((item) => (item.id === rowId ? { ...item, [field]: value } : item)) });
  };

  const addItem = () => update({ items: [...form.items, newRow()] });
  const removeItem = (rowId: string) => {
    if (form.items.length > 1) update({ items: form.items.filter((item) => item.id !== rowId) });
  };

  const handleAddClient = (input: ClientInput) => {
    const client = addClient(input);
    update({ clientId: client.id });
    setClientModalOpen(false);
  };

  const save = (status: QuotationStatus) => {
    setSubmitted(true);
    const found = validate(form);
    setErrors(found);
    if (hasErrors(found) || !selectedClient) {
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    const { id: _clientId, createdAt: _createdAt, ...clientSnapshot } = selectedClient;
    const input = {
      status,
      clientId: selectedClient.id,
      client: clientSnapshot,
      issueDate: form.issueDate,
      validityDays: Math.round(toNumber(form.validityDays)),
      validUntil,
      items: form.items.map((item) => ({
        id: item.id,
        description: item.description.trim(),
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        ...(item.imageUrl.trim() ? { imageUrl: item.imageUrl.trim() } : {}),
      })),
      discountType: form.discountType,
      discountValue: toNumber(form.discountValue),
      tax: form.tax,
      notes: form.notes.trim(),
    };

    const saved = isEdit && existing ? updateQuotation(existing.id, input) : createQuotation(input);
    if (saved) navigate(`/quotations/${saved.id}`);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    save(existing ? existing.status : 'pending');
  };

  if (isEdit && !existing) {
    return (
      <Card>
        <EmptyState
          icon={<FileText size={28} />}
          title="Quotation not found"
          description="It may have been deleted."
          action={<Link to="/quotations" className={buttonVariants({ variant: 'outline' })}>Back to quotations</Link>}
        />
      </Card>
    );
  }

  const rowErrors = errors.rows ?? {};

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to={existing ? `/quotations/${existing.id}` : '/quotations'}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft size={16} aria-hidden /> Back
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">
              {isEdit ? `Edit ${existing?.quoteNumber}` : 'Create Quotation'}
            </h1>
            {existing && <StatusBadge status={existing.status} />}
          </div>
          <p className="mt-1 text-sm text-slate-500 md:text-base dark:text-zinc-400">
            {isEdit ? 'Update the details below. Totals are recalculated automatically.' : 'Add the client and items. VAT and SSCL are calculated as you type.'}
          </p>
        </div>
        <div className="flex gap-3">
          {existing ? (
            <>
              <Link to={`/quotations/${existing.id}`} className={buttonVariants({ variant: 'outline', className: 'flex-1 sm:flex-none' })}>
                Cancel
              </Link>
              <Button type="submit" leftIcon={<Save size={16} />} className="flex-1 sm:flex-none">
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" leftIcon={<Save size={16} />} onClick={() => save('draft')} className="flex-1 sm:flex-none">
                Save Draft
              </Button>
              <Button type="submit" leftIcon={<Send size={16} />} className="flex-1 sm:flex-none">
                Submit for Approval
              </Button>
            </>
          )}
        </div>
      </div>

      {submitted && hasErrors(errors) && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          Please fix the highlighted fields before saving.
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left: form */}
        <div className="space-y-6 lg:col-span-8">
          {/* Client & document details */}
          <Card>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <section aria-labelledby="client-heading" className="space-y-4">
                <CardHeader title={<span id="client-heading">Client</span>} icon={<Users size={18} />} />
                <div className="flex items-end gap-2">
                  <SelectField
                    label="Select client"
                    required
                    value={form.clientId}
                    onChange={(clientId) => update({ clientId })}
                    error={errors.clientId}
                    placeholder="Choose a client…"
                    searchable
                    options={[...clients]
                      .sort((a, b) => a.companyName.localeCompare(b.companyName))
                      .map((c) => ({ value: c.id, label: c.companyName, description: [c.contactName, c.city].filter(Boolean).join(' · ') }))}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn('h-[42px] w-[42px] shrink-0', errors.clientId && 'mb-[22px]')}
                    onClick={() => setClientModalOpen(true)}
                    aria-label="Add new client"
                    title="Add new client"
                  >
                    <UserPlus size={18} />
                  </Button>
                </div>

                {selectedClient ? (
                  <div className="space-y-1.5 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                    <p className="font-semibold text-slate-900 dark:text-zinc-100">{selectedClient.contactName}</p>
                    {selectedClient.email && (
                      <p className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                        <Mail size={14} aria-hidden className="shrink-0" /> {selectedClient.email}
                      </p>
                    )}
                    {selectedClient.phone && (
                      <p className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                        <Phone size={14} aria-hidden className="shrink-0" /> {selectedClient.phone}
                      </p>
                    )}
                    {(selectedClient.address || selectedClient.city) && (
                      <p className="flex items-start gap-2 text-slate-600 dark:text-zinc-400">
                        <MapPin size={14} aria-hidden className="mt-0.5 shrink-0" />
                        {[selectedClient.address, selectedClient.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {selectedClient.taxId && <p className="text-xs text-slate-500 dark:text-zinc-500">TIN / VAT: {selectedClient.taxId}</p>}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-zinc-700 dark:text-zinc-400">
                    Pick an existing client or use <UserPlus size={14} className="inline align-text-bottom" aria-label="add client" /> to add a new one.
                  </p>
                )}
              </section>

              <section aria-labelledby="doc-heading" className="space-y-4">
                <CardHeader title={<span id="doc-heading">Quotation Details</span>} icon={<Calendar size={18} />} />
                <InputField
                  label="Quotation No"
                  value={existing?.quoteNumber ?? 'Assigned when saved'}
                  disabled
                  className="font-mono"
                />
                <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3">
                  <DatePicker
                    label="Issue date"
                    required
                    value={form.issueDate}
                    onChange={(issueDate) => update({ issueDate })}
                    error={errors.issueDate}
                  />
                  <InputField
                    label="Valid for"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={365}
                    suffix="days"
                    className="no-spinner"
                    value={form.validityDays}
                    onChange={(e) => update({ validityDays: e.target.value })}
                    error={errors.validityDays}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-brand-50/70 px-4 py-3 text-sm dark:bg-brand-500/10">
                  <span className="text-slate-600 dark:text-zinc-300">Valid until</span>
                  <span className="font-semibold text-brand-700 dark:text-brand-300">{formatDate(validUntil)}</span>
                </div>
              </section>
            </div>
          </Card>

          {/* Line items */}
          <Card flush className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-200/70 p-5 sm:flex-row sm:items-center sm:justify-between md:px-6 dark:border-zinc-800/70">
              <CardHeader title="Items & Services" description="Description, quantity and unit price in LKR. Click the photo box to add a picture." icon={<Package size={18} />} />
              <Button variant="secondary" size="sm" leftIcon={<Plus size={16} />} onClick={addItem} className="h-9 self-start sm:self-auto">
                Add Item
              </Button>
            </div>

            {/* Column headings (desktop) */}
            <div className="hidden grid-cols-[2rem_minmax(0,1fr)_6.5rem_9.5rem_9rem_2.5rem] gap-3 border-b border-slate-200/70 bg-slate-50/60 px-6 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid dark:border-zinc-800/70 dark:bg-zinc-900/40 dark:text-zinc-400">
              <span>#</span>
              <span>Description</span>
              <span>Qty</span>
              <span>Unit price</span>
              <span className="text-right">Line total</span>
              <span className="sr-only">Remove</span>
            </div>

            <ol className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {form.items.map((item, index) => {
                const e = rowErrors[item.id] ?? {};
                return (
                  <li
                    key={item.id}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3 px-5 py-4 md:grid-cols-[1.5rem_minmax(0,1fr)_5rem_8.5rem_8rem_2.25rem] md:items-start md:px-6"
                  >
                    <span className="hidden pt-2.5 text-sm font-medium text-slate-400 md:block">{index + 1}</span>
                    <div className="col-span-3 flex items-start gap-2 md:col-span-1">
                      <div className={cn('shrink-0', 'pt-[26px] md:pt-0')}>
                        <ItemImagePicker
                          value={item.imageUrl}
                          onChange={(url) => updateItem(item.id, 'imageUrl', url)}
                          itemLabel={`item ${index + 1}`}
                        />
                      </div>
                      <InputField
                        aria-label={`Item ${index + 1} description`}
                        placeholder="e.g. Website design and development"
                        value={item.description}
                        onChange={(ev) => updateItem(item.id, 'description', ev.target.value)}
                        error={e.description}
                        label="Description"
                        labelClassName="md:sr-only"
                      />
                    </div>
                    <InputField
                      aria-label={`Item ${index + 1} quantity`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      className="no-spinner"
                      value={item.quantity}
                      onChange={(ev) => updateItem(item.id, 'quantity', ev.target.value)}
                      error={e.quantity}
                      placeholder="Qty"
                      label="Qty"
                      labelClassName="md:sr-only"
                    />
                    <InputField
                      aria-label={`Item ${index + 1} unit price in LKR`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      className="no-spinner text-right"
                      value={item.unitPrice}
                      onChange={(ev) => updateItem(item.id, 'unitPrice', ev.target.value)}
                      error={e.unitPrice}
                      placeholder="0.00"
                      label="Unit price"
                      labelClassName="md:sr-only"
                    />
                    <div className="order-last col-span-3 flex items-center justify-between rounded-xl bg-slate-50/80 px-3 py-2.5 text-sm md:order-none md:col-span-1 md:block md:text-right dark:bg-zinc-900/50">
                      <span className="text-slate-500 md:hidden dark:text-zinc-400">Line total</span>
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                        {formatCurrency(totals.lineTotals[index] ?? 0, { symbol: '' })}
                      </span>
                    </div>
                    <div className="flex justify-end md:pt-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        disabled={form.items.length === 1}
                        aria-label={`Remove item ${index + 1}`}
                        title="Remove item"
                        className="hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                      >
                        <Trash2 size={17} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="border-t border-slate-200/70 px-5 py-3 md:px-6 dark:border-zinc-800/70">
              <button
                type="button"
                onClick={addItem}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/5 dark:hover:text-brand-400"
              >
                <Plus size={16} aria-hidden /> Add another item
              </button>
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <TextAreaField
              label="Terms & Notes"
              hint="Shown to the client at the bottom of the quotation."
              rows={5}
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Payment terms, delivery time, warranty…"
            />
          </Card>
        </div>

        {/* Right: live summary */}
        <aside className="lg:sticky lg:top-24 lg:col-span-4" aria-label="Quotation summary">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-brand-950 p-1 shadow-2xl shadow-brand-900/20">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-accent-500/25 blur-3xl" aria-hidden />

            <div className="relative space-y-4 rounded-[22px] border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300 backdrop-blur-2xl">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4 text-lg font-semibold text-white">
                <span className="rounded-xl bg-white/10 p-2">
                  <Calculator size={18} className="text-brand-300" aria-hidden />
                </span>
                Summary
              </div>

              <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />

              {/* Discount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span>Discount</span>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg bg-white/5 p-0.5 text-xs" role="radiogroup" aria-label="Discount type">
                      {(['percentage', 'fixed'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          role="radio"
                          aria-checked={form.discountType === t}
                          onClick={() => update({ discountType: t })}
                          className={cn(
                            'rounded-md px-2 py-1 font-medium transition',
                            form.discountType === t ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white',
                          )}
                        >
                          {t === 'percentage' ? '%' : 'LKR'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      aria-label={form.discountType === 'percentage' ? 'Discount percentage' : 'Discount amount in LKR'}
                      aria-invalid={errors.discount ? true : undefined}
                      placeholder="0"
                      value={form.discountValue}
                      onChange={(e) => update({ discountValue: e.target.value })}
                      className={cn(
                        'no-spinner w-24 rounded-lg border bg-white/5 px-3 py-1.5 text-right text-white outline-none transition hover:bg-white/10 focus:ring-2',
                        errors.discount ? 'border-rose-400 focus:ring-rose-400/50' : 'border-white/10 focus:ring-brand-400',
                      )}
                    />
                  </div>
                </div>
                {errors.discount && <p className="text-right text-xs text-rose-300">{errors.discount}</p>}
                {totals.discountAmount > 0 && (
                  <Row label="Discount amount" value={`− ${formatCurrency(totals.discountAmount)}`} className="text-emerald-400" />
                )}
              </div>

              <Row label="Net amount" value={formatCurrency(totals.netAmount)} className="border-t border-white/10 pt-4 font-medium text-white" />

              {/* Taxes */}
              <TaxRow
                label={`SSCL (${form.tax.ssclRate}%)`}
                enabled={form.tax.ssclEnabled}
                amount={totals.ssclAmount}
                onToggle={(on) => update({ tax: { ...form.tax, ssclEnabled: on } })}
              />
              <TaxRow
                label={`VAT (${form.tax.vatRate}%)`}
                enabled={form.tax.vatEnabled}
                amount={totals.vatAmount}
                onToggle={(on) => update({ tax: { ...form.tax, vatEnabled: on } })}
              />
              {form.tax.vatEnabled && form.tax.ssclEnabled && (
                <p className="-mt-2 text-xs text-slate-500">VAT is calculated on net amount + SSCL.</p>
              )}

              <div className="border-t border-white/10 pt-5">
                <div className="space-y-1">
                  <span className="block font-medium text-slate-200">Grand Total</span>
                  <span className="block break-words bg-gradient-to-r from-brand-300 via-white to-accent-300 bg-clip-text text-3xl font-bold tabular-nums text-transparent">
                    {formatCurrency(totals.grandTotal)}
                  </span>
                </div>
                <p className="mt-3 text-xs italic leading-relaxed text-slate-400">{amountToWords(totals.grandTotal)}</p>
                {validUntil && <p className="mt-2 text-xs text-slate-500">Valid until {formatDate(validUntil)}</p>}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ClientFormModal isOpen={clientModalOpen} onClose={() => setClientModalOpen(false)} onSubmit={handleAddClient} />
    </form>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <span>{label}</span>
      <span className="tabular-nums text-white">{value}</span>
    </div>
  );
}

function TaxRow({ label, enabled, amount, onToggle }: { label: string; enabled: boolean; amount: number; onToggle: (on: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`Apply ${label}`}
          onClick={() => onToggle(!enabled)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            enabled ? 'bg-brand-500' : 'bg-white/15',
          )}
        >
          <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', enabled ? 'translate-x-[18px]' : 'translate-x-0.5')} />
        </button>
        <span className={cn(!enabled && 'text-slate-500 line-through decoration-slate-600')}>{label}</span>
      </span>
      <span className={cn('tabular-nums', enabled ? 'text-white' : 'text-slate-500')}>
        {enabled ? `+ ${formatCurrency(amount)}` : '—'}
      </span>
    </div>
  );
}
