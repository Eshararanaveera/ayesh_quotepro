import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, FilePenLine, KeyRound, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Settings, TriangleAlert, X } from 'lucide-react';
import { NavItem } from '../components/navigation/NavItem';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { buttonVariants } from '../components/ui/button-variants';
import { MAIN_NAV, ROUTE_LABELS, SECONDARY_NAV, type NavEntry } from '../config/navigation';
import { STORAGE_KEYS } from '../config/constants';
import { useAppData } from '../hooks/useAppData';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { readStorage, writeStorage } from '../lib/storage';
import { cn } from '../lib/cn';

function initials(name: string): string {
  return (
    name
      .replace(/\(.*?\)/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'QP'
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-3 rounded-xl text-lg font-bold tracking-tight text-slate-900 transition hover:opacity-80 dark:text-white"
      aria-label="QuotePro home"
    >
      <span className="rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 p-2 shadow-lg shadow-brand-600/25">
        <FilePenLine className="h-5 w-5 text-white" aria-hidden />
      </span>
      {!collapsed && (
        <span>
          Quote<span className="text-brand-600 dark:text-brand-400">Pro</span>
        </span>
      )}
    </Link>
  );
}

/** Avatar button with the signed-in admin's details, settings and sign out. */
function ProfileMenu({ companyName, logo }: { companyName: string; logo: string | null }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-3 rounded-full p-0.5 transition hover:bg-slate-100 sm:pr-2 dark:hover:bg-zinc-800"
      >
        {logo ? (
          <img src={logo} alt="" className="h-9 w-9 rounded-full bg-white object-contain ring-2 ring-white dark:ring-zinc-800" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-semibold text-white ring-2 ring-white dark:ring-zinc-800">
            {initials(companyName)}
          </span>
        )}
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold text-slate-800 dark:text-zinc-100">{user?.name ?? 'Admin'}</span>
          <span className="block max-w-[10rem] truncate text-xs text-slate-500 dark:text-zinc-400">{companyName}</span>
        </span>
        <ChevronDown size={16} className="hidden text-slate-400 sm:block" aria-hidden />
      </button>

      {open && (
        <div role="menu" className="glass-strong absolute right-0 z-30 mt-2 w-60 animate-slide-down rounded-xl p-1.5">
          <div className="border-b border-slate-200/70 px-3 pb-2.5 pt-1.5 dark:border-zinc-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{user?.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-zinc-400">{user?.email}</p>
          </div>
          <div className="py-1">
            <button type="button" role="menuitem" className={itemClass} onClick={() => go('/settings')}>
              <Settings size={16} aria-hidden /> Settings
            </button>
            <button type="button" role="menuitem" className={itemClass} onClick={() => go('/settings?tab=security')}>
              <KeyRound size={16} aria-hidden /> Change password
            </button>
          </div>
          <div className="border-t border-slate-200/70 pt-1 dark:border-zinc-800">
            <button
              type="button"
              role="menuitem"
              className={cn(itemClass, 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10')}
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              <LogOut size={16} aria-hidden /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SidebarContentProps {
  collapsed: boolean;
  badges: Record<NonNullable<NavEntry['badge']>, number>;
  onNavigate?: () => void;
}

function SidebarContent({ collapsed, badges, onNavigate }: SidebarContentProps) {
  const renderItem = (item: NavEntry) => (
    <NavItem
      key={item.to}
      to={item.to}
      label={item.label}
      icon={item.icon}
      end={item.end}
      badge={item.badge ? badges[item.badge] : undefined}
      collapsed={collapsed}
      onNavigate={onNavigate}
    />
  );

  return (
    <nav aria-label="Main" className={cn('custom-scrollbar flex-1 overflow-y-auto py-5', collapsed ? 'px-3' : 'px-4')}>
      {!collapsed && (
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Menu</p>
      )}
      <div className={cn('space-y-1', collapsed && 'flex flex-col items-center')}>{MAIN_NAV.map(renderItem)}</div>
      <div className={cn('mt-6 space-y-1 border-t border-slate-200/70 pt-6 dark:border-zinc-800', collapsed && 'flex flex-col items-center')}>
        {SECONDARY_NAV.map(renderItem)}
      </div>
    </nav>
  );
}

/**
 * App shell: collapsible sidebar (drawer on mobile), sticky glass header with
 * breadcrumbs, theme toggle and profile, and the routed page in <Outlet />.
 */
export default function DashboardLayout() {
  const location = useLocation();
  const { quotations, clients, invoices } = useAppData();
  const { settings } = useSettings();
  const { usingDefaultPassword } = useAuth();

  const [collapsed, setCollapsed] = useState<boolean>(() => readStorage(STORAGE_KEYS.sidebarCollapsed, false));
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => writeStorage(STORAGE_KEYS.sidebarCollapsed, collapsed), [collapsed]);

  // Scroll to top on page change.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Close the mobile drawer with Escape and lock page scroll while it's open.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  const badges = useMemo(
    () => ({
      pendingQuotations: quotations.filter((q) => q.status === 'pending').length,
      clients: clients.length,
      unpaidInvoices: invoices.filter((i) => i.status !== 'paid').length,
    }),
    [quotations, clients, invoices],
  );

  const crumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [{ label: 'Dashboard', to: '/' }];
    return segments.map((segment, i) => {
      const quote = segments[0] === 'quotations' && i === 1 ? quotations.find((q) => q.id === segment) : undefined;
      return {
        label: quote?.quoteNumber ?? ROUTE_LABELS[segment] ?? segment,
        to: '/' + segments.slice(0, i + 1).join('/'),
      };
    });
  }, [location.pathname, quotations]);

  const companyName = settings.company.name || 'My Company';

  return (
    <div className="bg-blobs flex min-h-screen text-slate-900 dark:text-zinc-100 print:block print:bg-none">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-slate-200/70 bg-white/50 backdrop-blur-xl transition-[width] duration-300 md:flex dark:border-zinc-800/70 dark:bg-zinc-950/40 print:hidden',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <div className={cn('flex h-16 shrink-0 items-center border-b border-slate-200/70 dark:border-zinc-800/70', collapsed ? 'justify-center' : 'px-5')}>
          <Brand collapsed={collapsed} />
        </div>
        <SidebarContent collapsed={collapsed} badges={badges} />
        <div className={cn('border-t border-slate-200/70 p-3 dark:border-zinc-800/70', collapsed && 'flex justify-center')}>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex items-center gap-3 rounded-xl text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
              collapsed ? 'h-11 w-11 justify-center' : 'w-full px-3 py-2.5',
            )}
          >
            {collapsed ? <PanelLeftOpen size={20} aria-hidden /> : <PanelLeftClose size={20} aria-hidden />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="glass-strong relative flex h-full w-72 max-w-[85vw] animate-slide-in-left flex-col rounded-none border-y-0 border-l-0">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 px-5 dark:border-zinc-800">
              <Brand collapsed={false} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent collapsed={false} badges={badges} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200/70 bg-white/60 px-4 backdrop-blur-xl md:px-8 dark:border-zinc-800/70 dark:bg-zinc-950/50 print:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="-ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <Menu size={20} />
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex items-center gap-1.5 text-sm font-medium">
                {crumbs.map((crumb, i) => {
                  const last = i === crumbs.length - 1;
                  return (
                    <li key={crumb.to} className={cn('flex min-w-0 items-center gap-1.5', !last && 'hidden sm:flex')}>
                      {i > 0 && <ChevronRight size={14} className="hidden shrink-0 text-slate-300 sm:block dark:text-zinc-600" aria-hidden />}
                      {last ? (
                        <span aria-current="page" className="truncate text-slate-900 dark:text-zinc-100">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link to={crumb.to} className="truncate text-slate-500 transition hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                          {crumb.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {/* Pages that already have a prominent "create" button don't need this one. */}
            {!['/', '/quotations', '/quotations/new'].includes(location.pathname) && (
              <Link to="/quotations/new" className={buttonVariants({ size: 'sm', className: 'hidden h-9 lg:inline-flex' })}>
                <Plus size={16} aria-hidden />
                New Quotation
              </Link>
            )}
            <ThemeToggle />
            <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-zinc-800" aria-hidden />
            <ProfileMenu companyName={companyName} logo={settings.company.logo} />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 print:p-0">
          <div className="mx-auto w-full max-w-7xl">
            {usingDefaultPassword && (
              <div role="status" className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 print:hidden">
                <span className="flex items-center gap-2">
                  <TriangleAlert size={18} className="shrink-0" aria-hidden />
                  You're still using the default admin password.
                </span>
                <Link to="/settings?tab=security" className="font-semibold underline underline-offset-2 hover:no-underline">
                  Change it now
                </Link>
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
