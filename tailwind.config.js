/**
 * QuotePro — Tailwind configuration (Tailwind CSS v3)
 *
 * Brand colours come from CSS variables in src/index.css, so the whole palette
 * can be re-themed in one place while opacity modifiers such as
 * `bg-brand-600/25` keep working.
 */

/** Builds a 50–950 scale that reads RGB channels from CSS variables. */
const cssVarScale = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [
      step,
      `rgb(var(--${name}-${step}) / <alpha-value>)`,
    ]),
  );

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          ...cssVarScale('brand'),
          DEFAULT: 'rgb(var(--brand-600) / <alpha-value>)',
        },
        accent: {
          ...cssVarScale('accent'),
          DEFAULT: 'rgb(var(--accent-600) / <alpha-value>)',
        },
      },
      fontFamily: {
        // Sinhala and Tamil fallbacks so customer names and addresses render correctly
        sans: [
          'Inter',
          'Noto Sans Sinhala',
          'Noto Sans Tamil',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass: 'var(--glass-shadow)',
        'glass-lg': 'var(--glass-shadow-lg)',
        glow: '0 10px 30px -10px rgb(var(--brand-600) / 0.45)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'scale-in': 'scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 150ms ease-out',
        'slide-in-left': 'slide-in-left 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
