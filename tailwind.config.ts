import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#a682ff',
          50: '#fbf9ff',
          100: '#f3efff',
          200: '#e5ddff',
          300: '#d2c0ff',
          400: '#b99bff',
          500: '#a682ff',
          600: '#8a55ff',
          700: '#6f34e6',
          800: '#5626b3',
          900: '#3f1b80',
        },
      },
    },
  },
  plugins: [],
}
export default config

