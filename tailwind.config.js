/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#050818', 900: '#0a1030', 800: '#111a45', 700: '#1b2760' },
        violet: { glow: '#8b5cf6' },
        cyan: { glow: '#22d3ee' },
      },
      fontFamily: { sans: ['Sora', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
