/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        admin: {
          bg: '#050811',
          surface: '#0B1528',
          card: '#101F38',
          border: '#1E293B',
          muted: '#64748B',
          accent: '#2563EB',
          accentLight: '#38BDF8',
          online: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        }
      }
    },
  },
  plugins: [],
}
