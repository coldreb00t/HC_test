import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
//давай затестим

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Алиас для src
    },
  },
  server: {
    host: true, // Позволяет доступ с мобильных устройств в локальной сети
    port: 3000,
  },
  build: {
    target: 'es2015', // Обеспечивает совместимость с большинством мобильных браузеров
    cssTarget: 'chrome61', // Обеспечивает совместимость с iOS Safari
    assetsInlineLimit: 4096, // Оптимизация для мобильных устройств
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['./src/components/ui/index.ts'],
        },
      },
    },
  },
});