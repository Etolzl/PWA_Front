import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    headers: { 'Service-Worker-Allowed': '/' }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: { manualChunks: { vendor: ['react', 'react-dom'] } }
    }
  },
  base: '/', // ✅ rutas absolutas
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { include: ['react', 'react-dom'] },
  define: { __DEV__: JSON.stringify(process.env.NODE_ENV === 'development') }
})
