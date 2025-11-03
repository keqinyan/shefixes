import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import supabaseResolverPlugin from './vite-plugin-supabase-resolver.js';

export default defineConfig({
  plugins: [supabaseResolverPlugin(), react()],
  resolve: {
    dedupe: ['@supabase/supabase-js'],
    mainFields: ['module', 'main', 'jsnext:main', 'jsnext'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [],
    }
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
    esbuildOptions: {
      mainFields: ['module', 'main'],
    }
  }
});