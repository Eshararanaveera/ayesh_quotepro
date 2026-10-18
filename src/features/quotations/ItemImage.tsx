import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { ImageOff, ImagePlus, Link2, LoaderCircle, Trash2, Upload, X } from 'lucide-react';
import { FloatingPanel } from '../../components/ui/FloatingPanel';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isDataImage = (value: string) => /^data:image\/[a-z0-9.+-]+;base64,/i.test(value.trim());

/**
 * http(s) links, or images embedded as `data:image/...` (what Google Images
 * gives you with "Copy image address"). Anything else, such as `javascript:`, is rejected.
 */
export function isValidImageUrl(value: string): boolean {
  const v = value.trim();
  if (isDataImage(v)) return true;
  try {
    const url = new URL(v);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Turns common "page" links into direct image links:
 * - Google Images result page (…/imgres?imgurl=…) → the real image
 * - Google Drive share link → Drive thumbnail (file must be shared "Anyone with the link")
 * - Dropbox share link → raw file
 * - Imgur page → i.imgur.com image
 */
export function normalizeImageUrl(input: string): string {
  const value = input.trim();
  if (!value || isDataImage(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  const host = url.hostname.replace(/^www\./, '');

  // Google Images: the real image is in the imgurl parameter.
  if (/^google\./.test(host) && url.searchParams.get('imgurl')) {
    return url.searchParams.get('imgurl') as string;
  }

  // Google Drive: /file/d/<id>/view or ?id=<id>
  if (host === 'drive.google.com') {
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
  }

  // Dropbox: ?dl=0 → ?raw=1
  if (host === 'dropbox.com') {
    url.searchParams.delete('dl');
    url.searchParams.set('raw', '1');
    return url.toString();
  }

  // Imgur page (imgur.com/abc123) → direct image
  if (host === 'imgur.com' && /^\/[a-zA-Z0-9]{5,8}$/.test(url.pathname)) {
    return `https://i.imgur.com${url.pathname}.jpg`;
  }

  return value;
}

const MAX_SIDE = 320;

/**
 * Shrinks an image (file, blob or data URL) to a small JPEG thumbnail,
 * about 20–40 KB, so many photos fit in the browser's storage and print quickly.
 */
function shrinkImage(source: Blob | string): Promise<string> {
  return new Promise((resolve, reject) => {
    const src = typeof source === 'string' ? source : URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.fillStyle = '#fff'; // white behind transparent PNGs
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (typeof source !== 'string') URL.revokeObjectURL(src);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      if (typeof source !== 'string') URL.revokeObjectURL(src);
      reject(new Error('Not an image'));
    };
    img.src = src;
  });
}

const sizeLabel = (dataUrl: string) => `${Math.max(1, Math.round((dataUrl.length * 3) / 4 / 1024))} KB`;

// ---------------------------------------------------------------------------
// Thumbnail
// ---------------------------------------------------------------------------

interface ItemThumbnailProps {
  url?: string;
  alt: string;
  className?: string;
  /** Load straight away (use on the printable page so images are ready before printing). */
  eager?: boolean;
}

/**
 * Small square product photo with a fallback icon if the link is broken.
 * `referrerPolicy="no-referrer"` helps with sites that block images shown on other websites.
 */
export function ItemThumbnail({ url, alt, className, eager = false }: ItemThumbnailProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (!url) return null;
  if (failed) {
    return (
      <span
        className={cn('flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-zinc-800', className)}
        title="Image couldn't be loaded"
      >
        <ImageOff size={16} aria-hidden />
        <span className="sr-only">Image couldn't be loaded</span>
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('shrink-0 rounded-lg border border-slate-200 bg-white object-cover dark:border-zinc-700', className)}
    />
  );
}

// ---------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------

interface ItemImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  /** Used in labels, e.g. "item 2". */
  itemLabel: string;
}

type PreviewState = 'idle' | 'loading' | 'ok' | 'error';

/**
 * Square button in each line-item row. Click it, then either:
 *  • paste an image link (Google Images, Drive, Dropbox and Imgur links are fixed automatically),
 *  • copy a picture and press Ctrl+V, or
 *  • upload a photo from the computer.
 */
export function ItemImagePicker({ value, onChange, itemLabel }: ItemImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [previewState, setPreviewState] = useState<PreviewState>('idle');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resolved = normalizeImageUrl(draft);
  const validUrl = isValidImageUrl(resolved);
  const isEmbedded = isDataImage(resolved);

  const openPanel = () => {
    setDraft(value);
    setPreviewState(value ? 'loading' : 'idle');
    setNotice('');
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  /** Use a picked/pasted file as the photo. */
  const applyFile = async (file: Blob) => {
    setBusy(true);
    setNotice('');
    try {
      setDraft(await shrinkImage(file));
      setPreviewState('loading');
    } catch {
      setNotice("That file isn't an image we can read. Try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      void applyFile(file);
    }
  };

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    // The panel lives inside the quotation <form> in React's tree, so stop the
    // submit from bubbling up and saving the whole quotation.
    e?.stopPropagation();
    if (draft.trim() && !validUrl) return;

    let finalUrl = resolved;
    // Big embedded images (e.g. pasted from Google) are shrunk before saving.
    if (isEmbedded && finalUrl.length > 60_000) {
      setBusy(true);
      try {
        finalUrl = await shrinkImage(finalUrl);
      } catch {
        /* keep original */
      } finally {
        setBusy(false);
      }
    }
    onChange(finalUrl);
    close();
  };

  const remove = () => {
    onChange('');
    close();
  };

  const error =
    notice ||
    (draft.trim() && !validUrl
      ? 'That is not a web link. It should start with https://'
      : previewState === 'error'
        ? 'No picture at this link. It may be a web page, or the site blocks sharing. Try "Copy image" and press Ctrl+V here, or upload the photo.'
        : '');

  const wasFixed = !isEmbedded && validUrl && resolved !== draft.trim();

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : openPanel())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `Change photo for ${itemLabel}` : `Add photo for ${itemLabel}`}
        title={value ? 'Change photo' : 'Add photo'}
        className={cn(
          'group relative flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-xl transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
          value
            ? 'border border-slate-200 bg-white dark:border-zinc-700'
            : 'border border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:bg-brand-50/60 hover:text-brand-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-400',
        )}
      >
        {value ? <ItemThumbnail url={value} alt="" className="h-full w-full rounded-none border-0" /> : <ImagePlus size={18} aria-hidden />}
      </button>

      {open && (
        <FloatingPanel
          ref={panelRef}
          anchorRef={buttonRef}
          role="dialog"
          aria-label={`Photo for ${itemLabel}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
            }
          }}
          className="w-[21rem] rounded-2xl p-4"
        >
          <form onSubmit={save} noValidate>
            <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">Item photo</p>

            {/* Link / paste box */}
            {isEmbedded ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span>Picture added · {sizeLabel(resolved)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setDraft('');
                    setPreviewState('idle');
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  aria-label="Clear picture"
                  className="rounded-md p-1 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setNotice('');
                    setPreviewState(e.target.value.trim() ? 'loading' : 'idle');
                  }}
                  onPaste={handlePaste}
                  placeholder="Paste image link, or Ctrl+V a picture"
                  aria-label="Image link"
                  aria-invalid={error ? true : undefined}
                  className={cn(
                    'w-full rounded-xl border bg-white/80 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 dark:bg-zinc-950/60 dark:text-zinc-100',
                    error
                      ? 'border-rose-400 focus:ring-rose-500/30'
                      : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/30 dark:border-zinc-700',
                  )}
                />
              </div>
            )}
            {wasFixed && previewState !== 'error' && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">Converted to a direct image link ✓</p>
            )}

            {/* Preview */}
            <div className="relative mt-3 flex h-36 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950/50">
              {validUrl && (
                <img
                  key={resolved}
                  src={resolved}
                  alt="Preview"
                  referrerPolicy="no-referrer"
                  onLoad={() => setPreviewState('ok')}
                  onError={() => setPreviewState('error')}
                  className={cn('max-h-full max-w-full object-contain', previewState === 'error' && 'hidden')}
                />
              )}
              {(!validUrl || previewState === 'error') && !busy && (
                <span className="flex flex-col items-center gap-1.5 px-4 text-center text-xs text-slate-400 dark:text-zinc-500">
                  {previewState === 'error' ? <ImageOff size={22} aria-hidden /> : <ImagePlus size={22} aria-hidden />}
                  {previewState === 'error' ? 'Preview not available' : 'Your picture will appear here'}
                </span>
              )}
              {(busy || (validUrl && previewState === 'loading')) && (
                <LoaderCircle size={22} className="absolute animate-spin text-brand-500" aria-label="Loading" />
              )}
            </div>

            {error && (
              <p role="alert" className="mt-2 text-xs leading-relaxed text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            {/* Upload */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void applyFile(file);
              }}
            />
            <Button variant="outline" size="sm" leftIcon={<Upload size={14} />} className="mt-3 w-full" onClick={() => fileRef.current?.click()}>
              Upload from computer
            </Button>

            <div className="mt-4 flex items-center justify-between gap-2">
              {value ? (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 size={14} />}
                  onClick={remove}
                  aria-label="Remove photo"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  Remove
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={busy || (!!draft.trim() && (!validUrl || previewState === 'error'))}>
                  Save
                </Button>
              </div>
            </div>
          </form>
        </FloatingPanel>
      )}
    </>
  );
}
