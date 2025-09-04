import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const API_BASE = env.VITE_API_BASE || '/api'
  const API_TARGET = env.VITE_API_TARGET || 'http://localhost:3000'

  console.log('API_BASE', API_BASE)
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        [API_BASE]: {
          target: API_TARGET,
          changeOrigin: true,
          rewrite: (p) => p.replace(new RegExp(`^${API_BASE}`), ''),
        },
      },
    },
    build: {
      sourcemap: mode !== 'production',
    },
  }
})