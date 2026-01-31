/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: '#e5e7eb',
        panel: '#f9fafb',
        hover: '#f3f4f6',
        active: '#eef2ff',
        muted: '#6b7280',
      },
    },
  },
  plugins: [],
}
