import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

export interface FloatingPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** The element the panel opens from (e.g. the dropdown button). */
  anchorRef: RefObject<HTMLElement | null>;
  /** Make the panel at least as wide as the anchor. */
  matchWidth?: boolean;
}

const GAP = 8;
const EDGE = 8;

/**
 * Pop-up panel drawn at the top level of the page (a React portal) and
 * positioned next to its anchor.
 *
 * Glass cards use backdrop-filter, which makes each card its own layer, so
 * a dropdown inside one card would be hidden under the next card. Drawing the
 * panel at the page level keeps it on top. It opens below the anchor, or above
 * when there isn't room, and follows the anchor when the page scrolls.
 */
export const FloatingPanel = forwardRef<HTMLDivElement, FloatingPanelProps>(function FloatingPanel(
  { anchorRef, matchWidth = false, className, style, children, ...props },
  forwardedRef,
) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth?: number; origin: 'top' | 'bottom' } | null>(null);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  useLayoutEffect(() => {
    const update = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const a = anchor.getBoundingClientRect();
      const width = Math.max(panel.offsetWidth, matchWidth ? a.width : 0);
      const height = panel.offsetHeight;

      const spaceBelow = window.innerHeight - a.bottom;
      const openUp = spaceBelow < height + GAP + EDGE && a.top > spaceBelow;
      const top = openUp ? Math.max(EDGE, a.top - height - GAP) : a.bottom + GAP;
      const left = Math.min(Math.max(EDGE, a.left), window.innerWidth - width - EDGE);

      setPos({ top, left: Math.max(EDGE, left), minWidth: matchWidth ? a.width : undefined, origin: openUp ? 'bottom' : 'top' });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (panelRef.current) observer?.observe(panelRef.current);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      observer?.disconnect();
    };
  }, [anchorRef, matchWidth]);

  return createPortal(
    <div
      ref={setRefs}
      className={cn('glass-strong fixed z-[60] animate-slide-down bg-white/95 dark:bg-zinc-900/95', className)}
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        minWidth: pos?.minWidth,
        maxWidth: `calc(100vw - ${EDGE * 2}px)`,
        transformOrigin: pos?.origin === 'bottom' ? 'bottom' : 'top',
        // Transparent (not hidden) for the first frame while it's positioned, so focus can still move inside.
        opacity: pos ? undefined : 0,
        pointerEvents: pos ? undefined : 'none',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
});
