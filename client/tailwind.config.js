/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          50: '#f7f7ff',
          100: '#eeefff',
          200: '#dfe0ff',
          300: '#c5c2ff',
          400: '#9e97f5',
          500: '#7066e8',
          600: '#5d52d8',
          700: '#4d43b9',
          950: '#171625',
        },
      },
      boxShadow: {
        soft: '0 18px 50px -24px rgba(41, 34, 97, 0.28)',
      },
    },
  },
  plugins: [],
};
