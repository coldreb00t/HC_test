/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'iphone': '390px',  // iPhone 16 ширина
        'xs': '320px',      // Маленькие телефоны
        'sm': '640px',      // Планшеты и большие телефоны
        'md': '768px',      // Маленькие ноутбуки
        'lg': '1024px',     // Десктопы
        'xl': '1280px',     // Большие десктопы
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
};
