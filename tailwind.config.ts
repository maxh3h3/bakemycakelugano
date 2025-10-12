import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCFB',
          100: '#F9F6F1',
          200: '#F5E6D3',
          300: '#EDD7B8',
          400: '#E5C89D',
        },
        rose: {
          50: '#FFF5F5',
          100: '#FFE8E8',
          200: '#FFD4D4',
          300: '#FFB5B5',
          400: '#FF9696',
        },
        brown: {
          400: '#A68A6B',
          500: '#8B6B47',
          600: '#6F5438',
          700: '#533D29',
        },
        charcoal: {
          500: '#6B6B6B',
          700: '#4A4A4A',
          900: '#2C2C2C',
        },
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;

