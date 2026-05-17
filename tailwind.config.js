/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#22d3ee',
        surface: '#1e1e2e',
        background: '#0f0f1a',
        muted: '#6b7280',
      },
    },
  },
  plugins: [],
};
