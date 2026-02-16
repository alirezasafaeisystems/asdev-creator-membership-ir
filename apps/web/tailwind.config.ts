import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IRANSansX', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial'],
      },
    },
  },
  plugins: [],
} satisfies Config;

