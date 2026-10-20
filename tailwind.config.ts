import type { Config } from 'tailwindcss';

// Design tokens from plan.md section 9.0 (prototype: design/home.html).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#FFF6E6', deep: '#F6E6C6' },
        board: '#F3DFB8',
        ink: { DEFAULT: '#1D1B2E', soft: '#4A4760' },
        line: '#D6CBB3',
        gold: '#FFE08A',
        accent: '#2B59C3',
        family: {
          red: '#C8382D',
          blue: '#2B59C3',
          green: '#2E8B57',
          yellow: '#E8B730',
          purple: '#7B4FB3',
          black: '#26252B',
        },
      },
      fontFamily: {
        display: ['Kanit', 'system-ui', 'sans-serif'],
        body: ['Sarabun', 'system-ui', 'sans-serif'],
        sans: ['Sarabun', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        panel: '18px',
        btn: '12px',
        board: '24px',
      },
      boxShadow: {
        hard: '4px 4px 0 #1D1B2E',
        'hard-sm': '2px 2px 0 #1D1B2E',
        press: '0 5px 0 #1D1B2E',
        card: '3px 4px 0 rgba(29, 27, 46, 0.85)',
      },
    },
  },
  plugins: [],
} satisfies Config;
