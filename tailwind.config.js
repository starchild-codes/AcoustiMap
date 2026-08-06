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
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 30, 20, 0.04), 0 8px 24px -12px rgba(15, 30, 20, 0.08)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
