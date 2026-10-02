/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#003527",
        "primary-container": "#064e3b",
        "on-primary": "#ffffff",
        "on-primary-container": "#80bea6",
        "secondary": "#006c49",
        "secondary-container": "#6cf8bb",
        "tertiary": "#003625",
      },
      fontFamily: {
        heading: ['"Space Grotesk"', '"Prompt"', 'sans-serif'],
        sans: ['"Prompt"', '"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -2px rgba(16, 185, 129, 0.45)',
        'drawer': '-10px 0 40px -10px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [],
}