/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0F1620',
        panel: '#16202C',
        border: '#243040',
        cyan: '#4FD8E8',
        amber: '#F0A83A',
        green: '#4CAF7D',
        red: '#E15656',
        text: '#E7ECEF',
        muted: '#8B98A5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
