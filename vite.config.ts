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
});