import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', lg: '2rem' },
      screens: { '2xl': '1200px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Pirinç/bronz — sıcak aksan: birincil CTA, fiyat, imza çizgileri
        brass: {
          DEFAULT: 'hsl(var(--brass))',
          foreground: 'hsl(var(--brass-foreground))',
          strong: 'hsl(var(--brass-strong))',
          ondark: 'hsl(var(--brass-on-dark))',
        },
        whatsapp: 'hsl(var(--whatsapp) / <alpha-value>)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 1px)',
        sm: 'calc(var(--radius) - 2px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: [
          'var(--font-display)',
          'var(--font-sans)',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        // Sıcak tonlu, yumuşak yükseltiler — kartlar hover'da hafifçe kalkar
        'soft-sm': '0 1px 2px hsl(40 24% 18% / 0.06)',
        soft: '0 10px 30px -14px hsl(40 26% 16% / 0.18)',
        'soft-lg': '0 26px 60px -22px hsl(154 32% 12% / 0.30)',
      },
      transitionTimingFunction: {
        'out-quart': 'var(--ease-out-quart)',
        'in-out-quint': 'var(--ease-in-out-quint)',
        'out-expo': 'var(--ease-out-expo)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'ping-few': 'ping 1.2s cubic-bezier(0, 0, 0.2, 1) 1s 3 both',
      },
    },
  },
  plugins: [animate],
};

export default config;
