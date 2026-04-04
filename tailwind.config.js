/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'forge-navy': '#0A192F',
        'forge-azure': '#0047AB',
        'forge-cerulean': '#00A3E1',
      }
    },
  },
  plugins: [],
}