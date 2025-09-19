import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages')
      }
    },
    server: {
      port: 5173,
    },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          manualChunks: {
            react: ['react', 'react-dom'],
            antd: ['antd'],
            web3: ['web3'],
            axios: ['axios'],
            ethers: ['ethers'],
          }
        }
      }
    },
    define: {
      __APP_ENV__: env.APP_ENV,
    }
  }
})