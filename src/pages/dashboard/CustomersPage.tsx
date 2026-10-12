import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ClientFormModal } from '../../features/customers/ClientFormModal';
import { useAppData } from '../../hooks/useAppData';
import { formatCurrency } from '../../utils/formatters';
import type { Client, ClientInput } from '../../types/quotation';

const AVATAR_COLOURS = [
  'from-brand-500 to-accent-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-sky-500 to-blue-600',
  'from-rose-500 to-pink-500',
];

function avatarColour(id: string): string {
  const hash = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}

export default function CustomersPage() {
  const { clients, quotations, addClient, updateClient, deleteClient } = useAppData();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  // Quote count and approved value per client.
  const stats = useMemo(() => {
    const map = new Map<string, { quotes: number; approvedValue: number }>();
    for (const q of quotations) {
      const entry = map.get(q.clientId) ?? { quotes: 0, approvedValue: 0 };
      entry.quotes += 1;
      if (q.status === 'approved') entry.approvedValue += q.totals.grandTotal;
      map.set(q.clientId, entry);
    }
    return map;
  }, [quotations]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...clients]
      .filter(
        (c) =>
          !term ||
          [c.companyName, c.contactName, c.email, c.phone, c.city].some((field) => field.toLowerCase().includes(term)),
      )
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [clients, search]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setModalOpen(true);
  };

  const handleSubmit = (values: ClientInput) => {
    if (editing) updateClient(editing.id, values);
    else addClient(values);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`${clients.length} client${clients.length === 1 ? '' : 's'} in your directory.`}
        actions={
          <Button leftIcon={<UserPlus size={18} />} onClick={openAdd}>
            Add Client
          </Button>
        }
      />

      <InputField
        aria-label="Search clients"
        type="search"
        icon={<Search size={16} />}
        placeholder="Search by company, contact, email, phone or city…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        containerClassName="sm:max-w-md"
      />

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={28} />}
            title={clients.length === 0 ? 'No clients yet' : 'No clients match your search'}
            description={clients.length === 0 ? 'Add your first client to start sending quotations.' : 'Try a different name, email or city.'}
            action={
              clients.length === 0 ? (
                <Button leftIcon={<Plus size={18} />} onClick={openAdd}>
                  Add Client
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => {
            const s = stats.get(client.id) ?? { quotes: 0, approvedValue: 0 };
            return (
              <li key={client.id} className="glass group flex flex-col rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-glass-lg">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white shadow-md ${avatarColour(client.id)}`}
                    aria-hidden
                  >
                    {client.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-slate-900 dark:text-zinc-100" title={client.companyName}>
                      {client.companyName}
                    </h2>
                    <p className="truncate text-sm text-slate-500 dark:text-zinc-400">{client.contactName}</p>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-100 transition md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)} aria-label={`Edit ${client.companyName}`} title="Edit">
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                      onClick={() => setDeleting(client)}
                      aria-label={`Delete ${client.companyName}`}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-zinc-300">
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2.5 truncate hover:text-brand-600 dark:hover:text-brand-400">
                    <Mail size={15} className="shrink-0 text-slate-400" aria-hidden /> {client.email}
                  </a>
                  {client.phone && (
                    <a href={`tel:${client.phone.replace(/\s/g, '')}`} className="flex items-center gap-2.5 hover:text-brand-600 dark:hover:text-brand-400">
                      <Phone size={15} className="shrink-0 text-slate-400" aria-hidden /> {client.phone}
                    </a>
                  )}
                  {(client.address || client.city) && (
                    <p className="flex items-start gap-2.5">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                      <span className="line-clamp-2">{[client.address, client.city].filter(Boolean).join(', ')}</span>
                    </p>
                  )}
                </div>

                <div className="flex-1" aria-hidden />
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200/70 pt-4 dark:border-zinc-800/70">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Quotations</p>
                    <p className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-zinc-100">
                      <FileText size={14} className="text-slate-400" aria-hidden /> {s.quotes}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Approved value</p>
                    <p className="font-semibold tabular-nums text-slate-900 dark:text-zinc-100">{formatCurrency(s.approvedValue)}</p>
                  </div>
                </div>
                <Link
                  to={`/quotations/new?client=${client.id}`}
                  className="mt-4 text-center text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  New quotation →
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <ClientFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} client={editing} onSubmit={handleSubmit} />

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Delete client?"
        message={
          deleting
            ? `${deleting.companyName} will be removed from your directory. Existing quotations keep their copy of the client's details.`
            : ''
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteClient(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
