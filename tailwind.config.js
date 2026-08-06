/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f1f7f3',
          100: '#dcebe0',
          200: '#bbd6c3',
          300: '#8bb999',
          400: '#5a9169',
          500: '#3c7349',
          600: '#2c5a37',
          700: '#23472c',
          800: '#1d3a25',
          900: '#17301d',
        },
        ocean: {
          50: '#f0f6fa',
          100: '#d9e8f1',
          200: '#b4d0e3',
          300: '#82b2d2',
          400: '#4f8fbd',
          500: '#32729f',
          600: '#285b82',
          700: '#234a6a',
          800: '#1f3d57',
          900: '#1b3348',
        },
        sand: {
          50: '#faf9f6',
          100: '#f3f0e9',
          200: '#e7e0d2',
          300: '#d6cbb5',
          400: '#c0b094',
        },
        charcoal: {
          50: '#f7f6f4',
          100: '#e9e7e3',
          200: '#d3cfc9',
          300: '#b0aaa1',
          400: '#847d72',
          500: '#5f594f',
          600: '#443f37',
          700: '#33302a',
          800: '#24221e',
          900: '#1a1815',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26, 24, 21, 0.04), 0 1px 3px rgba(26, 24, 21, 0.03)',
        'card-hover': '0 2px 6px rgba(26, 24, 21, 0.06), 0 4px 16px -8px rgba(26, 24, 21, 0.08)',
        pop: '0 4px 24px -6px rgba(26, 24, 21, 0.12), 0 2px 8px -4px rgba(26, 24, 21, 0.06)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
    },
  },
  plugins: [],
}
