import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rilletBase = env.VITE_RILLET_BASE_URL || 'https://sandbox.api.rillet.com';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/rillet-api': {
          target: rilletBase,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/rillet-api/, ''),
        },
        '/excel-api': {
          target: 'http://localhost:5175',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/excel-api/, ''),
        },
      },
    },
  };
})
