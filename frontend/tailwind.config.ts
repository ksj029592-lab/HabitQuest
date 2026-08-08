/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        system: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'system-ui',
          '"Helvetica Neue"',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '20px',
        '3xl': '24px',
      },
      colors: {
        gray: {
          50: '#f9f9f9',
          100: '#f2f2f7',
          200: '#e5e5ea',
          300: '#d1d1d6',
          400: '#c7c7cc',
          500: '#a9a9b0',
          600: '#8e8e93',
          700: '#72727c',
          800: '#48484a',
          900: '#1c1c1e',
          950: '#000000',
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};
