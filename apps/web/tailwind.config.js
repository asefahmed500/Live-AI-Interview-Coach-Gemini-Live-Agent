/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Notion-inspired OKLCH Color Palette */
        notion: {
          white: 'oklch(1.00 0 0)',      /* Pure White - Background */
          50: 'oklch(0.99 0 0)',          /* Nearly White */
          100: 'oklch(0.97 0 0)',         /* Main Accent Gray */
          150: 'oklch(0.96 0 0)',         /* Hover State */
          200: 'oklch(0.95 0 0)',         /* Slightly Darker */
          300: 'oklch(0.94 0 0)',         /* Active State */
          400: 'oklch(0.92 0 0)',         /* Border */
          500: 'oklch(0.88 0 0)',         /* Darker Border */
          600: 'oklch(0.80 0 0)',         /* Strong Border */
          700: 'oklch(0.60 0 0)',         /* Muted Text */
          800: 'oklch(0.50 0 0)',         /* Tertiary Text */
          900: 'oklch(0.40 0 0)',         /* Secondary Text */
          950: 'oklch(0.20 0 0)',         /* Primary Text */
        },
        /* Semantic Colors - Notion Style */
        border: 'oklch(0.92 0 0)',
        background: 'oklch(1.00 0 0)',
        foreground: 'oklch(0.20 0 0)',
        muted: 'oklch(0.97 0 0)',
        'muted-foreground': 'oklch(0.50 0 0)',
        accent: 'oklch(0.97 0 0)',
        'accent-hover': 'oklch(0.94 0 0)',
        'accent-active': 'oklch(0.92 0 0)',
        /* Brand Blue - For Primary CTAs */
        brand: {
          DEFAULT: '#2383e2',
          hover: '#1a6fb8',
          light: 'rgba(35, 131, 226, 0.1)',
        },
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '6px',     /* Notion uses 6px */
        'lg': '8px',
        'xl': '10px',
      },
      boxShadow: {
        'notion': '0 1px 2px oklch(0.20 0 0 / 0.08)',
        'notion-md': '0 2px 4px oklch(0.20 0 0 / 0.08), 0 1px 2px oklch(0.20 0 0 / 0.04)',
        'notion-lg': '0 4px 8px oklch(0.20 0 0 / 0.08), 0 2px 4px oklch(0.20 0 0 / 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
}
