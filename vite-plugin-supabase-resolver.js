// Custom Vite plugin to resolve @supabase/supabase-js
import { createRequire } from 'module';
import path from 'path';

export default function supabaseResolverPlugin() {
  const require = createRequire(import.meta.url);

  return {
    name: 'supabase-resolver',
    enforce: 'pre',
    resolveId(id) {
      if (id === '@supabase/supabase-js') {
        try {
          // Use require.resolve to find the package
          const packageJsonPath = require.resolve('@supabase/supabase-js/package.json');
          const packageDir = path.dirname(packageJsonPath);
          const modulePath = path.join(packageDir, 'dist/module/index.js');

          return modulePath;
        } catch (e) {
          console.error('Failed to resolve @supabase/supabase-js:', e);
          return null;
        }
      }
      return null;
    }
  };
}
