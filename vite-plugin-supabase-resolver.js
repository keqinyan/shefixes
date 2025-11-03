// Custom Vite plugin to resolve @supabase/supabase-js
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export default function supabaseResolverPlugin() {
  return {
    name: 'supabase-resolver',
    enforce: 'pre',
    resolveId(id) {
      if (id === '@supabase/supabase-js') {
        try {
          // Direct path to the module entry point
          const supabaseModulePath = path.resolve(
            __dirname,
            'node_modules/@supabase/supabase-js/dist/module/index.js'
          );
          return supabaseModulePath;
        } catch (e) {
          console.error('Failed to resolve supabase:', e);
        }
      }
      return null;
    }
  };
}
