/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        antarctic: {
          navy: '#0a0e27',
          'navy-light': '#111638',
          'navy-mid': '#161b4a',
          panel: '#0f1430',
          border: '#1e2550',
        },
        ice: {
          DEFAULT: '#00d4ff',
          light: '#80eaff',
          dark: '#0099bb',
          glow: 'rgba(0, 212, 255, 0.15)',
        },
        aurora: {
          green: '#00ff88',
          'green-dark': '#00cc6a',
          purple: '#a855f7',
          pink: '#ff6b9d',
        },
        severity: {
          critical: '#ff3b3b',
          high: '#ff8c00',
          medium: '#ffd700',
          low: '#00d4ff',
          info: '#8b9dc3',
        },
        provenance: {
          measured: '#00ff88',
          simulated: '#00d4ff',
          assumption: '#ffd700',
          derived: '#a855f7',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'ice-glow': '0 0 20px rgba(0, 212, 255, 0.3)',
        'aurora-glow': '0 0 20px rgba(0, 255, 136, 0.3)',
        'panel': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
