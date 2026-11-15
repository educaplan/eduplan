/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#fffdf7', 100: '#fef8e6', 200: '#fcf1d0', 300: '#f1e3b4' },
        navy: { 800: '#0d1c42', 900: '#010736' },
        royal: { 600: '#22396f' },
        blue: { 50: '#f1f4fb', 100: '#e3e8f5' },
        line: '#e4d9b0',
        muted: '#5b6788',
        danger: { DEFAULT: '#b3382c', soft: '#fbe5e1' },
        success: { DEFAULT: '#067647', soft: '#ecfdf3' },
        decor: { gray: '#e8e5d9', yellow: '#f0e2b0' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 16px 40px rgba(1, 7, 54, 0.08)',
        btn: '0 8px 20px rgba(1, 7, 54, 0.18)',
        soft: '0 6px 18px rgba(1, 7, 54, 0.06)',
      },
    },
  },
  plugins: [],
};
