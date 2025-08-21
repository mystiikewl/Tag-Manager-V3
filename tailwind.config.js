/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  mode: 'jit',  // Enable JIT compiler
  content: [
    "./templates/**/*.html",
    "./static/js/**/*.js",
    "./static/components/**/*.vue",
    "./.storybook/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // New Apple-inspired brand color palette with bold red accents
        'brand-white': '#FFFFFF',
        'brand-near-white': '#F7F7F7', // Softer white for backgrounds
        'brand-dark': '#1A1A1A',       // Deep, rich dark
        'brand-near-dark': '#2C2C2C',  // Slightly softer dark for UI elements
        'brand-red': '#FF3B30',        // Apple's vibrant red - primary accent
        'brand-red-dark': '#D63027',   // Darker red for hover/active states
        'brand-grey-light': '#E5E5EA', // Light grey for borders, dividers
        'brand-grey-medium': '#8E8E93',// Medium grey for secondary text
        'brand-grey-dark': '#3A3A3C',  // Dark grey for subtle backgrounds on dark themes
        
        // Semantic colors
        'brand-success': '#34C759',    // Apple's green
        'brand-warning': '#FF9500',    // Apple's orange
        
        // Legacy colors (maintaining backward compatibility)
        primary: {
          50: '#e6f1ff',
          100: '#cce3ff',
          200: '#99c7ff',
          300: '#66aaff',
          400: '#338eff',
          500: '#0071e3',
          600: '#0066cc',
          700: '#0055aa',
          800: '#004488',
          900: '#003366',
        },
        secondary: {
          50: '#f2f2f7',
          100: '#e5e5e7',
          200: '#cacace',
          300: '#b0b0b6',
          400: '#95959d',
          500: '#86868b',
          600: '#77777a',
          700: '#68686a',
          800: '#59595a',
          900: '#4a4a4b',
        },
        background: '#f5f5f7',
        text: {
          primary: '#1d1d1f',
          secondary: '#86868b',
        },
      },
      fontFamily: {
        // Inter as primary font with SF Pro fallback
        sans: ['Inter', 'SF Pro Display', 'SF Pro Icons', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        // Maintain mono option for code/tabular data
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        // Enhanced typography scale with Apple-inspired sizing
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],       // Tight line height for large headings
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
        '7xl': ['4.5rem', { lineHeight: '1.1' }],
      },
      fontWeight: {
        // Enhanced font weights for bold hierarchy
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      letterSpacing: {
        // Apple-inspired letter spacing
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },
      borderRadius: {
        // Apple-inspired border radius
        'none': '0',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      boxShadow: {
        // Enhanced shadows for depth
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'none': 'none',
        // Brand-specific shadows
        'brand': '0 8px 25px -8px rgba(255, 59, 48, 0.3)',
        'brand-lg': '0 15px 35px -5px rgba(255, 59, 48, 0.25)',
      },
      backgroundImage: {
        'gradient-red': 'linear-gradient(to right, #FF3B30, #D63027)',
        'gradient-dark': 'linear-gradient(to right, #1A1A1A, #2C2C2C)',
        'gradient-light': 'linear-gradient(to right, #FFFFFF, #F7F7F7)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      animation: {
        // Smooth Apple-like animations
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-border-gradients')(),
    function({ addUtilities, addComponents }) {
      // Custom utilities for the new design system
      const newUtilities = {
        '.glass-panel': {
          background: 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(12px)',
          'border-radius': '0.75rem',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
          'box-shadow': '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
        },
        '.glass-panel-dark': {
          background: 'rgba(44, 44, 44, 0.8)',
          'backdrop-filter': 'blur(12px)',
          'border-radius': '0.75rem',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
          'box-shadow': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        },
        '.gradient-border': {
          position: 'relative',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: '-2px',
            left: '-2px',
            right: '-2px',
            bottom: '-2px',
            background: 'linear-gradient(to right, #FF3B30, #D63027)',
            'border-radius': '0.75rem',
            'z-index': '-1',
          }
        },
        '.brand-shadow': {
          'box-shadow': '0 8px 25px -8px rgba(255, 59, 48, 0.3)',
        },
        '.brand-shadow-lg': {
          'box-shadow': '0 15px 35px -5px rgba(255, 59, 48, 0.25)',
        },
      }
      
      // Component classes following Apple design patterns
      const newComponents = {
        '.btn-brand-primary': {
          '@apply px-6 py-3 rounded-lg bg-brand-red text-brand-white font-semibold text-base shadow-md hover:bg-brand-red-dark focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 transition-colors duration-150 ease-in-out': {},
        },
        '.btn-brand-secondary': {
          '@apply px-6 py-3 rounded-lg bg-brand-near-dark text-brand-white font-semibold text-base shadow-md hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-near-dark focus:ring-offset-2 transition-colors duration-150 ease-in-out': {},
        },
        '.btn-brand-ghost': {
          '@apply px-4 py-2 rounded-lg text-brand-dark hover:bg-brand-grey-light font-medium focus:outline-none focus:ring-2 focus:ring-brand-grey-medium focus:ring-offset-2 transition-colors duration-150 ease-in-out': {},
        },
        '.card-brand': {
          '@apply bg-brand-white rounded-xl shadow-lg p-6': {},
        },
        '.card-brand-dark': {
          '@apply bg-brand-near-dark rounded-xl shadow-lg p-6': {},
        },
        '.input-brand': {
          '@apply block w-full px-4 py-3 rounded-lg border border-brand-grey-light focus:ring-brand-red focus:border-brand-red shadow-sm placeholder-brand-grey-medium': {},
        },
        '.input-brand-dark': {
          '@apply block w-full px-4 py-3 rounded-lg border border-brand-grey-dark bg-brand-near-dark text-brand-white focus:ring-brand-red focus:border-brand-red shadow-sm placeholder-brand-grey-medium': {},
        },
      }
      
      addUtilities(newUtilities);
      addComponents(newComponents);
    }
  ],
}
