import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Building, Check, FileText, Globe, Hash, ImagePlus, KeyRound, Lock, Mail, Palette, Percent, Phone, RotateCcw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { TextAreaField } from '../../components/ui/TextAreaField';
import { Switch } from '../../components/ui/Switch';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useSettings } from '../../hooks/useSettings';
import { useAppData } from '../../hooks/useAppData';
import { useAuth } from '../../hooks/useAuth';
import { calculateQuotationTotals } from '../../utils/calculations';
import { formatCurrency, toNumber } from '../../utils/formatters';
import { TAX_RATES } from '../../config/constants';
import { cn } from '../../lib/cn';
import type { CompanyProfile, QuotationDefaults } from '../../types/settings';
import type { TaxConfig } from '../../types/quotation';

type TabId = 'company' | 'tax' | 'quotation' | 'security' | 'appearance';

const TABS: { id: TabId; label: string; icon: typeof Building }[] = [
  { id: 'company', label: 'Company Profile', icon: Building },
  { id: 'tax', label: 'Tax Settings', icon: Percent },
  { id: 'quotation', label: 'Quotation Defaults', icon: FileText },
  { id: 'security', label: 'Security', icon: KeyRound },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

const isTab = (value: string | null): value is TabId => TABS.some((t) => t.id === value);

const MAX_LOGO_BYTES = 500 * 1024;

/** Shows "Saved" for two seconds after a save. */
function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const flash = () => {
    setSaved(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 2000);
  };
  return [saved, flash] as const;
}

function SaveBar({ saved, label = 'Save Changes' }: { saved: boolean; label?: string }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-slate-200/70 pt-5 dark:border-zinc-800/70">
      <span role="status" className={cn('flex items-center gap-1.5 text-sm text-emerald-600 transition-opacity dark:text-emerald-400', saved ? 'opacity-100' : 'opacity-0')}>
        <Check size={16} aria-hidden /> Saved
      </span>
      <Button type="submit" leftIcon={<Save size={16} />}>
        {label}
      </Button>
    </div>
  );
}

function CompanyTab() {
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState<CompanyProfile>(settings.company);
  const [logoError, setLogoError] = useState('');
  const [saved, flash] = useSavedFlash();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof CompanyProfile) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) {
      setLogoError('Use a PNG, JPG, SVG or WebP image.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Logo must be smaller than 500 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, logo: String(reader.result) }));
      setLogoError('');
    };
    reader.readAsDataURL(file);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    updateSettings({ company: { ...form, name: form.name.trim() || settings.company.name } });
    flash();
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <CardHeader title="Company Profile" description="Shown on the header of every quotation you print or send." />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          {form.logo ? (
            <img src={form.logo} alt="Company logo" className="h-full w-full object-contain p-2" />
          ) : (
            <ImagePlus size={28} className="text-slate-300 dark:text-zinc-600" aria-hidden />
          )}
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" leftIcon={<ImagePlus size={15} />} onClick={() => fileRef.current?.click()}>
              {form.logo ? 'Change logo' : 'Upload logo'}
            </Button>
            {form.logo && (
              <Button variant="ghost" size="sm" leftIcon={<Trash2 size={15} />} onClick={() => setForm((p) => ({ ...p, logo: null }))}>
                Remove
              </Button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={handleLogo} aria-label="Upload company logo" />
          <p className={cn('mt-2 text-xs', logoError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-zinc-400')}>
            {logoError || 'PNG, JPG, SVG or WebP, up to 500 KB. A wide logo on a transparent background looks best.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <InputField label="Company name" required icon={<Building size={16} />} value={form.name} onChange={set('name')} containerClassName="md:col-span-2" />
        <TextAreaField label="Address" rows={3} value={form.address} onChange={set('address')} containerClassName="md:col-span-2" />
        <InputField label="Phone" type="tel" icon={<Phone size={16} />} placeholder="+94 11 234 5678" value={form.phone} onChange={set('phone')} />
        <InputField label="Email" type="email" icon={<Mail size={16} />} value={form.email} onChange={set('email')} />
        <InputField label="Website" type="url" icon={<Globe size={16} />} value={form.website} onChange={set('website')} containerClassName="md:col-span-2" />
        <InputField label="TIN (Taxpayer Identification No.)" icon={<Hash size={16} />} placeholder="e.g. 123456789" value={form.tin} onChange={set('tin')} />
        <InputField label="VAT Registration No." icon={<Hash size={16} />} placeholder="e.g. 123456789-7000" value={form.vatRegNo} onChange={set('vatRegNo')} hint="Required on tax invoices if you're VAT registered." />
      </div>

      <SaveBar saved={saved} />
    </form>
  );
}

function TaxTab() {
  const { settings, updateSettings } = useSettings();
  const [tax, setTax] = useState<TaxConfig>(settings.tax);
  const [saved, flash] = useSavedFlash();

  const example = calculateQuotationTotals([{ quantity: 1, unitPrice: 100000 }], { type: 'percentage', value: 0 }, tax);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    updateSettings({
      tax: {
        ...tax,
        vatRate: Math.min(100, Math.max(0, toNumber(tax.vatRate))),
        ssclRate: Math.min(100, Math.max(0, toNumber(tax.ssclRate))),
      },
    });
    flash();
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <CardHeader title="Tax Settings" description="Default taxes for new quotations. You can still switch them per quotation." />

      <div className="space-y-4">
        <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <Switch
            label="Charge SSCL by default"
            description="Social Security Contribution Levy, added before VAT."
            checked={tax.ssclEnabled}
            onChange={(on) => setTax((t) => ({ ...t, ssclEnabled: on }))}
          />
          <InputField
            label="SSCL rate"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            max={100}
            suffix="%"
            className="no-spinner"
            containerClassName="max-w-[10rem]"
            value={String(tax.ssclRate)}
            onChange={(e) => setTax((t) => ({ ...t, ssclRate: e.target.value === '' ? 0 : Number(e.target.value) }))}
            disabled={!tax.ssclEnabled}
            hint={`Standard rate: ${TAX_RATES.sscl}%`}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <Switch
            label="Charge VAT by default"
            description="Value Added Tax, calculated on the net amount plus SSCL."
            checked={tax.vatEnabled}
            onChange={(on) => setTax((t) => ({ ...t, vatEnabled: on }))}
          />
          <InputField
            label="VAT rate"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            max={100}
            suffix="%"
            className="no-spinner"
            containerClassName="max-w-[10rem]"
            value={String(tax.vatRate)}
            onChange={(e) => setTax((t) => ({ ...t, vatRate: e.target.value === '' ? 0 : Number(e.target.value) }))}
            disabled={!tax.vatEnabled}
            hint={`Standard rate: ${TAX_RATES.vat}%`}
          />
        </div>

        <div className="rounded-2xl border border-brand-200/70 bg-brand-50/60 p-5 text-sm dark:border-brand-500/20 dark:bg-brand-500/10">
          <p className="mb-3 font-semibold text-brand-900 dark:text-brand-200">Example: LKR 100,000.00 net amount</p>
          <dl className="space-y-1.5 text-slate-700 dark:text-zinc-300">
            <div className="flex justify-between"><dt>Net amount</dt><dd className="tabular-nums">{formatCurrency(example.netAmount)}</dd></div>
            <div className="flex justify-between"><dt>SSCL ({tax.ssclEnabled ? `${tax.ssclRate}%` : 'off'})</dt><dd className="tabular-nums">{formatCurrency(example.ssclAmount)}</dd></div>
            <div className="flex justify-between"><dt>VAT ({tax.vatEnabled ? `${tax.vatRate}%` : 'off'})</dt><dd className="tabular-nums">{formatCurrency(example.vatAmount)}</dd></div>
            <div className="flex justify-between border-t border-brand-200/70 pt-1.5 font-semibold text-slate-900 dark:border-brand-500/20 dark:text-white">
              <dt>Grand total</dt><dd className="tabular-nums">{formatCurrency(example.grandTotal)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">
            Check with your accountant how SSCL should appear on your invoices — it's a turnover levy, so some businesses don't show it as a separate line.
          </p>
        </div>
      </div>

      <SaveBar saved={saved} />
    </form>
  );
}

function QuotationTab() {
  const { settings, updateSettings } = useSettings();
  const { resetData } = useAppData();
  const [form, setForm] = useState<QuotationDefaults>(settings.quotation);
  const [saved, flash] = useSavedFlash();
  const [confirmReset, setConfirmReset] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const days = Math.round(toNumber(form.validityDays));
    updateSettings({
      quotation: {
        prefix: form.prefix.trim().toUpperCase() || 'QT',
        validityDays: days >= 1 && days <= 365 ? days : settings.quotation.validityDays,
        notes: form.notes,
      },
    });
    flash();
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <CardHeader title="Quotation Defaults" description="Pre-filled on every new quotation." />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <InputField
          label="Number prefix"
          value={form.prefix}
          maxLength={6}
          onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
          hint={`Next numbers look like ${(form.prefix.trim().toUpperCase() || 'QT')}-${new Date().getFullYear()}-0001`}
        />
        <InputField
          label="Valid for"
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          suffix="days"
          className="no-spinner"
          value={String(form.validityDays)}
          onChange={(e) => setForm((f) => ({ ...f, validityDays: e.target.value === '' ? 0 : Number(e.target.value) }))}
        />
        <TextAreaField
          label="Default terms & notes"
          rows={6}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          containerClassName="sm:col-span-2"
        />
      </div>
      <SaveBar saved={saved} />

      <div className="rounded-2xl border border-rose-200/70 p-5 dark:border-rose-500/20">
        <p className="font-medium text-slate-900 dark:text-zinc-100">Reset sample data</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Data is saved in this browser until a backend is connected. This replaces your clients and quotations with the original samples.
        </p>
        <Button variant="outline" size="sm" leftIcon={<RotateCcw size={15} />} className="mt-3" onClick={() => setConfirmReset(true)}>
          Reset data
        </Button>
      </div>
      <ConfirmDialog
        isOpen={confirmReset}
        title="Reset all data?"
        message="Your clients, quotations and invoices in this browser will be replaced with the sample data."
        confirmLabel="Reset"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetData();
          setConfirmReset(false);
        }}
      />
    </form>
  );
}

/** Password rules shown as a live checklist. */
const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'An uppercase and a lowercase letter', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'At least one number', test: (p) => /\d/.test(p) },
];

function SecurityTab() {
  const { user, changePassword, usingDefaultPassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);
  const [saved, flash] = useSavedFlash();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = 'Enter your current password';
    if (!PASSWORD_RULES.every((r) => r.test(next))) found.next = 'Password does not meet all the rules below';
    else if (next === current) found.next = 'New password must be different';
    if (confirm !== next) found.confirm = "Passwords don't match";
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    const result = await changePassword(current, next);
    setLoading(false);
    if (!result.ok) {
      setErrors({ current: result.error });
      return;
    }
    setCurrent('');
    setNext('');
    setConfirm('');
    flash();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <CardHeader title="Security" description={`Change the password for ${user?.email ?? 'the admin account'}.`} />

      {usingDefaultPassword && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          You're using the default password. Choose a new one so only you can sign in.
        </p>
      )}

      <div className="max-w-md space-y-5">
        <InputField
          label="Current password"
          type="password"
          autoComplete="current-password"
          icon={<Lock size={16} />}
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            setErrors((x) => ({ ...x, current: undefined }));
          }}
          error={errors.current}
        />
        <InputField
          label="New password"
          type="password"
          autoComplete="new-password"
          icon={<KeyRound size={16} />}
          value={next}
          onChange={(e) => {
            setNext(e.target.value);
            setErrors((x) => ({ ...x, next: undefined }));
          }}
          error={errors.next}
        />
        <ul className="space-y-1.5 text-xs" aria-label="Password rules">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(next);
            return (
              <li key={rule.label} className={cn('flex items-center gap-2', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-zinc-400')}>
                {ok ? <Check size={14} aria-hidden /> : <span className="mx-[3px] h-2 w-2 rounded-full border border-current" aria-hidden />}
                {rule.label}
                <span className="sr-only">{ok ? '(done)' : '(not yet)'}</span>
              </li>
            );
          })}
        </ul>
        <InputField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          icon={<ShieldCheck size={16} />}
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setErrors((x) => ({ ...x, confirm: undefined }));
          }}
          error={errors.confirm}
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200/70 pt-5 dark:border-zinc-800/70">
        <span role="status" className={cn('flex items-center gap-1.5 text-sm text-emerald-600 transition-opacity dark:text-emerald-400', saved ? 'opacity-100' : 'opacity-0')}>
          <Check size={16} aria-hidden /> Password updated
        </span>
        <Button type="submit" loading={loading} leftIcon={<Save size={16} />}>
          Update Password
        </Button>
      </div>
    </form>
  );
}

function AppearanceTab() {
  return (
    <div className="space-y-6">
      <CardHeader title="Appearance" description="Choose a theme, or follow your device setting." />
      <ThemeToggle variant="segmented" />
    </div>
  );
}

export default function SettingsPage() {
  // ?tab=security opens a specific tab (used by the account menu).
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabId = isTab(tabParam) ? tabParam : 'company';
  const setTab = (id: TabId) => setSearchParams(id === 'company' ? {} : { tab: id }, { replace: true });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Company details, taxes and preferences." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div role="tablist" aria-label="Settings sections" aria-orientation="vertical" className="custom-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                'flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                tab === id
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200/70 dark:bg-zinc-900 dark:text-brand-300 dark:ring-zinc-800'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-100',
              )}
            >
              <Icon size={18} aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <Card role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="md:p-8">
          {tab === 'company' && <CompanyTab />}
          {tab === 'tax' && <TaxTab />}
          {tab === 'quotation' && <QuotationTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'appearance' && <AppearanceTab />}
        </Card>
      </div>
    </div>
  );
}
