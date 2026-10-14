/** @type {import('tailwindcss').Config} */
// ธีมแบรนด์ Boardgame Everyday: เขียวเข้ม #2F4F2F · แดงอิฐ #CD5C5C · ครีม #F5F5DC · มัสตาร์ด #DAA520 · เขียวน้ำทะเล #008080
// emerald / slate ถูกปรับเป็นโทนแบรนด์ → คลาสเดิมทั้งเว็บ (bg-emerald-700, text-slate-500 …) เปลี่ยนสีตามแบรนด์ทันที
const forest = {
  50: '#f2f6f1',
  100: '#e1ebdf',
  200: '#c3d6bf',
  300: '#9ab995',
  400: '#6e956a',
  500: '#4f7a4c',
  600: '#3d613b',
  700: '#2f4f2f',
  800: '#273f27',
  900: '#203320',
  950: '#111c11',
};
const warmSlate = {
  50: '#faf8ef',
  100: '#f3f0e1',
  200: '#e6e0c8',
  300: '#d2cbad',
  400: '#a9a283',
  500: '#7c7864',
  600: '#5f5d4d',
  700: '#46473a',
  800: '#2f3229',
  900: '#1f2a1f',
  950: '#121810',
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        emerald: forest,
        slate: warmSlate,
        forest: { DEFAULT: '#2f4f2f', dark: '#233b23', ...forest },
        brick: { DEFAULT: '#cd5c5c', dark: '#b04545', light: '#f6dcdc' },
        cream: { DEFAULT: '#f5f5dc', light: '#faf8ef', dark: '#e9e6c4' },
        mustard: { DEFAULT: '#daa520', dark: '#b8860b', light: '#f8e8b8' },
        teal: { DEFAULT: '#008080', dark: '#006666', light: '#d5eeee' },
        ink: '#1f2a1f',
        // คีย์เดิมที่บางหน้าใช้อยู่
        primary: '#2f4f2f',
        'primary-container': '#2f4f2f',
        'on-primary': '#ffffff',
        'on-primary-container': '#c3d6bf',
        secondary: '#008080',
        'secondary-container': '#d5eeee',
        tertiary: '#daa520',
      },
      fontFamily: {
        heading: ['"Kanit"', 'sans-serif'],
        sans: ['"Kanit"', 'sans-serif'],
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -2px rgba(47, 79, 47, 0.35)',
        drawer: '-10px 0 40px -10px rgba(0, 0, 0, 0.25)',
        card: '0 2px 0 0 rgba(31, 42, 31, 0.08), 0 10px 24px -12px rgba(47, 79, 47, 0.25)',
      },
    },
  },
  plugins: [],
};
