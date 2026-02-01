import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Nexus Platform Dark Theme
        background: '#1a1a2e',
        sidebar: '#16213e',
        primary: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
        foreground: '#f3f4f6',
        secondary: {
          DEFAULT: '#1f2937',
          foreground: '#e5e7eb',
        },
        muted: {
          DEFAULT: '#374151',
          foreground: '#9ca3af',
        },
        accent: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: '#374151',
        input: '#374151',
        ring: '#10b981',
        card: {
          DEFAULT: '#1f2937',
          foreground: '#f9fafb',
        },
        popover: {
          DEFAULT: '#1f2937',
          foreground: '#f9fafb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'heartbeat-pulse': {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 currentColor' },
          '50%': { transform: 'scale(1.1)', boxShadow: '0 0 0 4px transparent' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 currentColor' },
        },
        'context-loading': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'heartbeat-pulse': 'heartbeat-pulse 2s ease-in-out infinite',
        'context-loading': 'context-loading 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
