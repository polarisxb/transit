import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// In development the portal is served by Vite and the API by a local new-api;
// proxying keeps both on one origin so the HttpOnly refresh cookie works.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:3210'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      // Windows 默认只绑 [::1]，127.0.0.1:5173 会连不上。true 同时听 IPv4。
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false },
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'portal-assets',
      sourcemap: false,
    },
  }
})
