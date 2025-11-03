import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    mainFields: ['module', 'main'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
    esbuildOptions: {
      mainFields: ['module', 'main'],
    }
  }
});