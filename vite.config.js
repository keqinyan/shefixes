import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Fix for Supabase in Vite
      '@supabase/supabase-js': '@supabase/supabase-js/dist/module/index.js'
    }
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  }
});