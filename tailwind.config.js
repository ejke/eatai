/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF8',
        surface: '#FFFFFF',
        surface2: '#F5F0EB',
        primary: '#C2602A',
        'primary-dark': '#9A4A1F',
        cycle: '#7C5C8A',
        'cycle-light': '#E8DFF0',
        fast: '#2A6B6E',
        'fast-light': '#D0EAEB',
        'quality-high': '#5A8C5A',
        'quality-mid': '#C4A444',
        'quality-low': '#B85050',
        text: '#1A1A1A',
        'text-muted': '#6B6B6B',
      },
    },
  },
  plugins: [],
}
